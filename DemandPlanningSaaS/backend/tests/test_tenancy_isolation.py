"""Cross-tenant isolation tests (EPIC A) — release-blocking.

Verifies that data written under one organization is never readable by another,
that writes are auto-stamped with the tenant, that a tenant row cannot be created
without a tenant context (fail-closed), and that cross-tenant access-by-id 404s.
"""

from datetime import datetime

import pytest

import models
import tenancy
from auth.security import create_access_token


def _seed_demand(db_session, org_id, dataset_version):
    """Insert a demand record under the given tenant (stamped via before_flush)."""
    tenancy.set_current_org_id(org_id)
    try:
        db_session.add(
            models.DemandRecord(
                date=datetime(2026, 1, 1), target_demand=100.0, sku="SKU1",
                category="C", location="L", channel="Ch", dataset_version=dataset_version,
            )
        )
        db_session.commit()
    finally:
        tenancy.reset_current_org_id()


def test_write_is_auto_stamped_with_tenant(db_session, make_org):
    org = make_org()
    _seed_demand(db_session, org.id, "vX")
    tenancy.set_current_org_id(org.id)
    try:
        row = db_session.query(models.DemandRecord).first()
    finally:
        tenancy.reset_current_org_id()
    assert row.organization_id == org.id


def test_contextless_tenant_write_fails_closed(db_session, make_org):
    make_org()
    with pytest.raises(RuntimeError):
        db_session.add(
            models.DemandRecord(
                date=datetime(2026, 1, 1), target_demand=1.0, sku="S",
                category="C", location="L", channel="Ch", dataset_version="v",
            )
        )
        db_session.commit()
    db_session.rollback()


def test_reads_are_isolated_between_tenants(db_session):
    import auth.models as auth_models

    # Two orgs, each with its own dataset.
    org_a = auth_models.Organization(name="A", slug="a")
    org_b = auth_models.Organization(name="B", slug="b")
    db_session.add_all([org_a, org_b])
    db_session.commit()
    _seed_demand(db_session, org_a.id, "vA")
    _seed_demand(db_session, org_b.id, "vB")

    tenancy.set_current_org_id(org_a.id)
    try:
        seen_a = {r.dataset_version for r in db_session.query(models.DemandRecord).all()}
    finally:
        tenancy.reset_current_org_id()

    tenancy.set_current_org_id(org_b.id)
    try:
        seen_b = {r.dataset_version for r in db_session.query(models.DemandRecord).all()}
    finally:
        tenancy.reset_current_org_id()

    assert seen_a == {"vA"}
    assert seen_b == {"vB"}


def test_api_datasets_isolated(client, db_session, make_org, make_user):
    org_a = make_org(name="OrgA", slug="orga")
    org_b = make_org(name="OrgB", slug="orgb")
    user_a = make_user(org_a, role="planner")
    user_b = make_user(org_b, role="planner")
    _seed_demand(db_session, org_a.id, "vA")
    _seed_demand(db_session, org_b.id, "vB")

    tok_a = create_access_token(user_a.id, org_a.id, "planner")
    tok_b = create_access_token(user_b.id, org_b.id, "planner")

    ra = client.get("/api/datasets", headers={"Authorization": f"Bearer {tok_a}"})
    rb = client.get("/api/datasets", headers={"Authorization": f"Bearer {tok_b}"})
    assert ra.json()["datasets"] == ["vA"]
    assert rb.json()["datasets"] == ["vB"]


def test_cross_tenant_get_by_id_returns_404(client, db_session, make_org, make_user):
    org_a = make_org(name="OrgA", slug="orga")
    org_b = make_org(name="OrgB", slug="orgb")
    admin_a = make_user(org_a, role="admin")
    admin_b = make_user(org_b, role="admin")

    # org B creates an approval request under its tenant context.
    tenancy.set_current_org_id(org_b.id)
    try:
        appr = models.ApprovalRequest(
            requester_id="b", approval_type="forecast_override",
            payload_json={"x": 1}, approver_role="admin", status="PENDING",
        )
        db_session.add(appr)
        db_session.commit()
        appr_id = appr.id
    finally:
        tenancy.reset_current_org_id()

    tok_a = create_access_token(admin_a.id, org_a.id, "admin")
    tok_b = create_access_token(admin_b.id, org_b.id, "admin")

    # org A admin (passes RBAC) cannot see org B's row -> 404, never 200/403.
    r = client.post(
        f"/api/workflow/approval/{appr_id}/decision?decision=APPROVED&approver_id=a",
        headers={"Authorization": f"Bearer {tok_a}"},
    )
    assert r.status_code == 404

    # The owning org can act on it.
    r = client.post(
        f"/api/workflow/approval/{appr_id}/decision?decision=APPROVED&approver_id=b",
        headers={"Authorization": f"Bearer {tok_b}"},
    )
    assert r.status_code not in (401, 403, 404)
