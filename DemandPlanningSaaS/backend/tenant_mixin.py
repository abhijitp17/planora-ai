"""TenantMixin — adds the ``organization_id`` tenant-scoping column to a model.

This module defines the COLUMN only. The runtime enforcement — auto-stamping
``organization_id`` on insert (``before_flush``) and filtering every read by the
current tenant (``with_loader_criteria``) — is registered separately in
``tenant_scoping.py`` and activated in a later milestone. Adding the mixin now
lets the schema migration introduce the column without turning on enforcement.
"""

from sqlalchemy import Column, ForeignKey, Integer
from sqlalchemy.orm import declared_attr


class TenantMixin:
    """Mix into any business model that must be isolated per organization."""

    @declared_attr
    def organization_id(cls):
        return Column(
            Integer,
            ForeignKey("organizations.id"),
            nullable=False,
            index=True,
        )
