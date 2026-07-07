"""Request-scoped tenant context.

The current organization id is stored in a ``ContextVar`` set once per request by
the auth layer (``get_current_user``) and read by the tenant read-filter
(``tenant_scoping.py``, activated in a later milestone). Keeping it in a ContextVar
means no endpoint has to thread ``organization_id`` through its call chain, and it
can never be spoofed by a client-supplied parameter.
"""

from contextvars import ContextVar
from typing import Optional

_current_org_id: ContextVar[Optional[int]] = ContextVar("current_org_id", default=None)


def set_current_org_id(org_id: int) -> None:
    _current_org_id.set(org_id)


def get_current_org_id() -> int:
    """Return the current tenant id, or fail closed if none is set.

    A tenant-scoped DB operation running without a tenant context is a bug (it would
    read/write across all tenants), so we raise rather than silently run unscoped.
    """
    org_id = _current_org_id.get()
    if org_id is None:
        raise RuntimeError(
            "No tenant context set — refusing to run a tenant-scoped DB operation."
        )
    return org_id


def try_get_current_org_id() -> Optional[int]:
    """Non-raising accessor for code that may legitimately run without a tenant
    (e.g. request logging, health checks)."""
    return _current_org_id.get()


def reset_current_org_id() -> None:
    _current_org_id.set(None)
