"""FastAPI auth dependencies: identity resolution and server-side RBAC.

``get_current_user`` is the single place where a request's identity is resolved
and its tenant context is established. Role/permission checks build on top of it.

The RBAC tables below are a verbatim mirror of the frontend's
``ROLE_RANK`` / ``ACTION_MIN_ROLE`` (``frontend/src/store/AuthContext.tsx``). The
server is the source of truth; the frontend copy is UX-only. A parity test
(``tests/test_action_map_parity.py``) fails CI if the two ever drift.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

import auth.models as auth_models
from auth.security import decode_token
from database import get_db
from tenancy import set_current_org_id

# OAuth2PasswordBearer extracts the "Authorization: Bearer <token>" header and
# returns 401 (not 403) when it is missing — matching the acceptance criterion that
# every protected route returns 401 without credentials. tokenUrl is docs metadata.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)

# ─── RBAC model (mirrors frontend/src/store/AuthContext.tsx) ──────────────────
ROLE_RANK = {"viewer": 0, "planner": 1, "manager": 2, "admin": 3}

ACTION_MIN_ROLE = {
    "view:dashboard": "viewer",
    "view:demand": "viewer",
    "view:inventory": "viewer",
    "view:diagnostics": "planner",
    "view:sop": "manager",
    "view:finance": "manager",
    "view:analytics": "viewer",
    "edit:forecast": "planner",
    "edit:consensus": "planner",
    "upload:dataset": "planner",
    "run:forecast": "planner",
    "export:data": "planner",
    "manage:users": "admin",
    "manage:settings": "admin",
}

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> auth_models.User:
    """Resolve the authenticated user from a Bearer access token and bind the
    request's tenant context. Raises 401 on any failure.

    This dependency is intentionally ``async``: it runs in the request's main
    event-loop context, so the tenant ContextVar it sets propagates into the
    (threadpool-executed) sync endpoint. A sync dependency would set the ContextVar
    in an isolated worker-thread context that the endpoint never sees.
    """
    try:
        payload = decode_token(token, expected_type="access")
        user_id = int(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise _CREDENTIALS_EXCEPTION

    user = db.query(auth_models.User).filter(auth_models.User.id == user_id).first()
    if user is None or not user.is_active:
        raise _CREDENTIALS_EXCEPTION

    # The one place tenant context is established for the request. Everything
    # tenant-scoped downstream derives from this — never from a client parameter.
    set_current_org_id(user.organization_id)
    return user


def require_role(min_role: str):
    """Dependency factory: require the user's role to rank >= ``min_role``."""

    def _dependency(
        user: auth_models.User = Depends(get_current_user),
    ) -> auth_models.User:
        if ROLE_RANK[user.role] < ROLE_RANK[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role '{min_role}' or higher.",
            )
        return user

    return _dependency


def require_permission(action: str):
    """Dependency factory: require the permission for ``action`` (via ACTION_MIN_ROLE).

    A KeyError here means the caller passed an action string not in the map — a
    programming error we want to surface loudly rather than fail open.
    """
    min_role = ACTION_MIN_ROLE[action]

    def _dependency(
        user: auth_models.User = Depends(get_current_user),
    ) -> auth_models.User:
        if ROLE_RANK[user.role] < ROLE_RANK[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action '{action}' requires role '{min_role}' or higher.",
            )
        return user

    return _dependency
