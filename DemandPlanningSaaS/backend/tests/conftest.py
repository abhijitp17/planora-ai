"""Shared pytest fixtures: in-memory test DB, TestClient, and org/user/auth factories.

Environment (JWT secret, DB URL) is set here BEFORE importing app modules, because
``database.py`` reads ``DATABASE_URL`` at import time.
"""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-pytest-only")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("LOG_LEVEL", "WARNING")

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
import models  # noqa: F401  (register business tables on Base.metadata)
import auth.models as auth_models  # noqa: F401  (register identity tables)
import tenancy
from auth.security import create_access_token, hash_password


@pytest.fixture()
def db_engine():
    """A fresh in-memory SQLite database per test.

    StaticPool + a single shared connection means every Session (the test's own and
    the app's request sessions) sees the same in-memory data.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def session_factory(db_engine):
    return sessionmaker(bind=db_engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine, session_factory):
    """TestClient whose get_db is overridden to use the in-memory test database."""
    from main import app

    def _override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_tenant_context():
    """Ensure no tenant context leaks between tests."""
    tenancy.reset_current_org_id()
    yield
    tenancy.reset_current_org_id()


@pytest.fixture()
def make_org(db_session):
    def _make(name="Test Org", slug=None):
        org = auth_models.Organization(name=name, slug=slug or f"org-{uuid.uuid4().hex[:8]}")
        db_session.add(org)
        db_session.commit()
        db_session.refresh(org)
        return org

    return _make


@pytest.fixture()
def make_user(db_session):
    def _make(org, email=None, role="admin", password="testpass123", is_active=True):
        user = auth_models.User(
            organization_id=org.id,
            email=(email or f"user-{uuid.uuid4().hex[:8]}@example.com").lower(),
            hashed_password=hash_password(password),
            name="Test User",
            role=role,
            is_active=is_active,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    return _make


@pytest.fixture()
def auth_headers(make_org, make_user):
    """Return (headers, org, user) for a freshly created org+user at the given role."""

    def _make(role="admin", org=None, password="testpass123"):
        org = org or make_org()
        user = make_user(org, role=role, password=password)
        token = create_access_token(user.id, org.id, user.role)
        return {"Authorization": f"Bearer {token}"}, org, user

    return _make
