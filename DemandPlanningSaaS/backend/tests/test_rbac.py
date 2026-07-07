"""Server-side RBAC tests (EPIC B, B-3).

Exercises the full 14-action x 4-role matrix directly against the
``require_permission`` dependency, plus a couple of end-to-end HTTP checks.
"""

import pytest
from fastapi import HTTPException

import auth.models as auth_models
from auth.dependencies import ACTION_MIN_ROLE, ROLE_RANK, require_permission

ROLES = ["viewer", "planner", "manager", "admin"]


def _user(role):
    return auth_models.User(
        id=1, organization_id=1, email="x@example.com",
        hashed_password="x", name="x", role=role, is_active=True,
    )


@pytest.mark.parametrize("action", list(ACTION_MIN_ROLE))
@pytest.mark.parametrize("role", ROLES)
def test_permission_matrix(action, role):
    dependency = require_permission(action)
    user = _user(role)
    should_pass = ROLE_RANK[role] >= ROLE_RANK[ACTION_MIN_ROLE[action]]
    if should_pass:
        assert dependency(user=user) is user
    else:
        with pytest.raises(HTTPException) as exc:
            dependency(user=user)
        assert exc.value.status_code == 403


def test_viewer_cannot_edit_forecast_over_http(auth_headers, client):
    headers, _, _ = auth_headers(role="viewer")
    r = client.post("/api/forecast?dataset_version=v&sku=s", headers=headers)
    assert r.status_code == 403


def test_planner_passes_run_forecast_auth_over_http(auth_headers, client):
    headers, _, _ = auth_headers(role="planner")
    r = client.post("/api/forecast?dataset_version=v&sku=s", headers=headers)
    # Past auth/RBAC (no data -> 404), the point is it is NOT 401/403.
    assert r.status_code not in (401, 403)


def test_manager_blocked_from_admin_only_over_http(auth_headers, client):
    headers, _, _ = auth_headers(role="manager")
    assert client.get("/api/audit/logs", headers=headers).status_code == 403
