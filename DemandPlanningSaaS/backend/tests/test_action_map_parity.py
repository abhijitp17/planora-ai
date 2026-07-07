"""Drift guard: the backend RBAC map must match the frontend's.

The frontend copies below are transcribed verbatim from
``frontend/src/store/AuthContext.tsx`` (ROLE_RANK + ACTION_MIN_ROLE). If the two
ever diverge, this test fails so the mismatch is caught in CI rather than silently
letting the client and server disagree about permissions.
"""

from auth.dependencies import ACTION_MIN_ROLE, ROLE_RANK

# ─── transcribed from frontend/src/store/AuthContext.tsx ──────────────────────
FRONTEND_ROLE_RANK = {"viewer": 0, "planner": 1, "manager": 2, "admin": 3}

FRONTEND_ACTION_MIN_ROLE = {
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


def test_role_rank_matches_frontend():
    assert ROLE_RANK == FRONTEND_ROLE_RANK


def test_action_min_role_matches_frontend():
    assert ACTION_MIN_ROLE == FRONTEND_ACTION_MIN_ROLE
