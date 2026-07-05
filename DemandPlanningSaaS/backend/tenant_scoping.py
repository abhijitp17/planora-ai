"""Runtime tenant isolation, registered globally on the SQLAlchemy Session.

Two Session events do the work:

1. ``do_orm_execute`` (reads): transparently AND a
   ``organization_id == <current tenant>`` predicate onto every SELECT against a
   tenant-scoped model, via ``with_loader_criteria``. Endpoints keep their existing
   queries unchanged; the filter is added at the ORM-execution layer.

2. ``before_flush`` (writes): auto-stamp ``organization_id`` on any newly added
   tenant-scoped row that hasn't set it, so inserts can never omit the tenant.

``bulk_save_objects`` bypasses ``before_flush`` by design, so its (single) call site
stamps ``organization_id`` explicitly — see ``main.py`` upload endpoint.

Import this module once (from ``database.py``) to activate the events process-wide.
"""

from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

import models
from tenancy import get_current_org_id, try_get_current_org_id
from tenant_mixin import TenantMixin

# The business models isolated by tenant. Identity models (Organization, User) are
# intentionally excluded — they are read to establish the tenant in the first place.
TENANT_SCOPED_MODELS = (
    models.DemandRecord,
    models.ForecastResult,
    models.AuditLog,
    models.DemandSensingSignal,
    models.CalendarEvent,
    models.ApprovalRequest,
    models.SKUMaster,
)

# Execution option to bypass the read filter for deliberate cross-tenant/system code.
SKIP_TENANT_FILTER = "skip_tenant_filter"


@event.listens_for(Session, "do_orm_execute")
def _apply_tenant_read_filter(execute_state) -> None:
    if not execute_state.is_select:
        return
    # Relationship/column lazy-loads already inherit the parent's scoping; re-filtering
    # them can conflict with eager-load internals, so only touch top-level SELECTs.
    if execute_state.is_relationship_load or execute_state.is_column_load:
        return
    if execute_state.execution_options.get(SKIP_TENANT_FILTER, False):
        return

    org_id = try_get_current_org_id()
    if org_id is None:
        # No tenant context: this is a public/auth query (e.g. loading a User during
        # login) or a maintenance script. Tenant-scoped business endpoints always run
        # under an authenticated principal (enforced for every route in M4 and asserted
        # by the auth-coverage test), so no tenant read reaches here unscoped.
        return

    for model in TENANT_SCOPED_MODELS:
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                model,
                # `org_id` MUST be referenced as a tracked closure variable (not a
                # default arg): SQLAlchemy's lambda cache then parameterizes it into a
                # per-execution bindparam. A default arg would be baked in on first use
                # and wrongly reused for later tenants.
                lambda cls: cls.organization_id == org_id,
                include_aliases=True,
            )
        )


@event.listens_for(Session, "before_flush")
def _stamp_organization_id(session, flush_context, instances) -> None:
    org_id = None
    for obj in session.new:
        if isinstance(obj, TenantMixin) and getattr(obj, "organization_id", None) is None:
            if org_id is None:
                # Fail closed: creating a tenant row with no tenant context is a bug.
                org_id = get_current_org_id()
            obj.organization_id = org_id
