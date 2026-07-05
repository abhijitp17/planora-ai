"""Auth-coverage sweep (EPIC B, B-2): every non-public route rejects anonymous access.

Iterates the live route table and asserts each guarded route returns 401 without a
token. This is what makes "no endpoint returns data without a valid token" a
continuously-enforced invariant rather than a one-time manual check.
"""

import re

# Routes that are intentionally public (no authentication required).
PUBLIC_PATHS = {
    "/",
    "/health/ready",
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/password-reset/request",
    "/api/auth/password-reset/confirm",
}


def test_every_guarded_route_requires_auth(client):
    from main import app

    checked = 0
    offenders = []
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", None)
        if not path or not methods:
            continue
        if not (path.startswith("/api") or path == "/"):
            continue
        if path in PUBLIC_PATHS:
            continue
        concrete = re.sub(r"\{[^}]+\}", "1", path)  # fill path params with a dummy
        for method in methods - {"HEAD", "OPTIONS"}:
            checked += 1
            resp = client.request(method, concrete)  # no Authorization header
            if resp.status_code != 401:
                offenders.append((method, path, resp.status_code))

    assert checked > 60, f"expected to sweep the full API surface, only saw {checked}"
    assert not offenders, f"routes not returning 401 without credentials: {offenders}"
