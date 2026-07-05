"""Identity models: Organization (the tenant boundary) and User.

These are deliberately kept separate from the business-domain models in
``models.py``. They are also intentionally NOT tenant-scoped by the shared
read filter (see ``tenant_scoping.py``): a ``User`` row must be readable
*before* any tenant context exists, because reading it is how we discover
which organization the request belongs to.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)

from database import Base


class Organization(Base):
    """A tenant. Every business record belongs to exactly one organization."""

    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    """An authenticated principal, scoped to a single organization."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )
    # Email is GLOBALLY unique in Phase 0 (a user belongs to one org, and login is
    # email+password with no org selector — the existing frontend UX). This is a
    # deliberate deviation from PRD §10's "unique-per-org"; revisit if/when the same
    # person needs distinct accounts across multiple orgs (would require an org
    # discriminator at login, e.g. an org slug or subdomain).
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    # One of: 'viewer' | 'planner' | 'manager' | 'admin' (see auth.dependencies.ROLE_RANK).
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    # Account-lockout bookkeeping (populated by the auth flow in a later milestone).
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
