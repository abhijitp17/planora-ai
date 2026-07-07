"""Authentication endpoint tests (EPIC B)."""

import os


def test_login_success_returns_token_pair(client, make_org, make_user):
    org = make_org()
    make_user(org, email="admin@example.com", role="admin", password="secretpw123")
    r = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "secretpw123"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["token_type"] == "bearer"


def test_login_wrong_password_401(client, make_org, make_user):
    org = make_org()
    make_user(org, email="a@example.com", password="rightpw123")
    r = client.post("/api/auth/login", json={"email": "a@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_email_401(client):
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_token_returns_user(client, make_org, make_user):
    org = make_org()
    make_user(org, email="me@example.com", role="planner", password="pw12345678")
    token = client.post(
        "/api/auth/login", json={"email": "me@example.com", "password": "pw12345678"}
    ).json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "me@example.com"
    assert r.json()["role"] == "planner"


def test_me_with_malformed_token_401(client):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"}).status_code == 401


def test_refresh_rotates_tokens(client, make_org, make_user):
    org = make_org()
    make_user(org, email="r@example.com", password="pw12345678")
    pair = client.post(
        "/api/auth/login", json={"email": "r@example.com", "password": "pw12345678"}
    ).json()
    r = client.post("/api/auth/refresh", json={"refresh_token": pair["refresh_token"]})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_refresh_with_access_token_rejected(client, make_org, make_user):
    """A refresh must not accept an access token (wrong token type)."""
    org = make_org()
    make_user(org, email="t@example.com", password="pw12345678")
    pair = client.post(
        "/api/auth/login", json={"email": "t@example.com", "password": "pw12345678"}
    ).json()
    r = client.post("/api/auth/refresh", json={"refresh_token": pair["access_token"]})
    assert r.status_code == 401


def test_account_lockout_after_repeated_failures(client, make_org, make_user, monkeypatch):
    monkeypatch.setenv("MAX_FAILED_LOGIN_ATTEMPTS", "3")
    # router reads the env at call time via module constant; reload to pick it up
    import importlib
    import auth.router as router_mod
    importlib.reload(router_mod)

    org = make_org()
    make_user(org, email="lock@example.com", password="correctpw123")
    for _ in range(3):
        assert client.post(
            "/api/auth/login", json={"email": "lock@example.com", "password": "bad"}
        ).status_code == 401
    # Now even the correct password is locked out.
    r = client.post("/api/auth/login", json={"email": "lock@example.com", "password": "correctpw123"})
    assert r.status_code == 423

    importlib.reload(router_mod)  # restore default threshold for other tests


def test_password_reset_flow(client, make_org, make_user):
    from auth.security import create_password_reset_token

    org = make_org()
    user = make_user(org, email="reset@example.com", password="oldpassword1")

    # request is enumeration-safe: unknown email yields the same generic 200
    r = client.post("/api/auth/password-reset/request", json={"email": "unknown@example.com"})
    assert r.status_code == 200 and "if that account" in r.json()["message"].lower()

    # confirm with a valid reset token sets the new password
    token = create_password_reset_token(user.id)
    r = client.post(
        "/api/auth/password-reset/confirm",
        json={"token": token, "new_password": "brandnewpw9"},
    )
    assert r.status_code == 200
    assert client.post(
        "/api/auth/login", json={"email": "reset@example.com", "password": "brandnewpw9"}
    ).status_code == 200


def test_password_reset_invalid_token_400(client):
    r = client.post(
        "/api/auth/password-reset/confirm",
        json={"token": "garbage", "new_password": "whatever12"},
    )
    assert r.status_code == 400


def test_no_plaintext_password_stored(db_session, make_org, make_user):
    org = make_org()
    user = make_user(org, password="myplaintextpw1")
    assert user.hashed_password != "myplaintextpw1"
    assert user.hashed_password.startswith("$2")  # bcrypt hash marker
