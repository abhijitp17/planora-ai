"""add organizations and tenant fk

Introduces multi-tenancy: the ``organizations`` and ``users`` identity tables,
and an ``organization_id`` foreign key on every business table. Existing rows are
backfilled into a single "Default Organization" (id=1) so the change is lossless
on a populated database, per PRD EPIC A.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-05 02:43:12.239854
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Business tables that only need the plain tenant column. sku_master is handled
# separately below because it also swaps a global-unique index for a per-org one.
_SIMPLE_TENANT_TABLES = [
    "approval_requests",
    "audit_logs",
    "calendar_events",
    "demand_records",
    "demand_sensing_signals",
    "forecast_results",
]

DEFAULT_ORG_ID = 1


def upgrade() -> None:
    # 1. Identity tables. organizations is created before any FK references it.
    op.create_table(
        'organizations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('organizations', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_organizations_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_organizations_slug'), ['slug'], unique=True)

    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('failed_login_attempts', sa.Integer(), nullable=False),
        sa.Column('locked_until', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)
        batch_op.create_index(batch_op.f('ix_users_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_organization_id'), ['organization_id'], unique=False)

    # 2. Seed the default organization so existing business rows can point at it.
    op.execute(
        "INSERT INTO organizations (id, name, slug, created_at) "
        f"VALUES ({DEFAULT_ORG_ID}, 'Default Organization', 'default', CURRENT_TIMESTAMP)"
    )

    # 3. Add organization_id to each business table with the safe
    #    add-nullable -> backfill -> set-NOT-NULL sequence (lossless on populated tables).
    for table in _SIMPLE_TENANT_TABLES:
        op.add_column(table, sa.Column('organization_id', sa.Integer(), nullable=True))
        op.execute(f"UPDATE {table} SET organization_id = {DEFAULT_ORG_ID}")
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.alter_column('organization_id', existing_type=sa.Integer(), nullable=False)
            batch_op.create_index(batch_op.f(f'ix_{table}_organization_id'), ['organization_id'], unique=False)
            batch_op.create_foreign_key(
                f'fk_{table}_organization_id', 'organizations', ['organization_id'], ['id']
            )

    # 4. sku_master: tenant column + swap the global-unique sku index for a per-org
    #    unique constraint (two tenants may share a SKU code).
    op.add_column('sku_master', sa.Column('organization_id', sa.Integer(), nullable=True))
    op.execute(f"UPDATE sku_master SET organization_id = {DEFAULT_ORG_ID}")
    with op.batch_alter_table('sku_master', schema=None) as batch_op:
        batch_op.alter_column('organization_id', existing_type=sa.Integer(), nullable=False)
        batch_op.drop_index(batch_op.f('ix_sku_master_sku'))
        batch_op.create_index(batch_op.f('ix_sku_master_sku'), ['sku'], unique=False)
        batch_op.create_index(batch_op.f('ix_sku_master_organization_id'), ['organization_id'], unique=False)
        batch_op.create_unique_constraint('uq_sku_master_org_sku', ['organization_id', 'sku'])
        batch_op.create_foreign_key(
            'fk_sku_master_organization_id', 'organizations', ['organization_id'], ['id']
        )


def downgrade() -> None:
    # Reverse of step 4: drop the tenant column (which cascades its FK/index) and
    # restore the original global-unique sku index.
    with op.batch_alter_table('sku_master', schema=None) as batch_op:
        batch_op.drop_constraint('uq_sku_master_org_sku', type_='unique')
        batch_op.drop_index(batch_op.f('ix_sku_master_organization_id'))
        batch_op.drop_index(batch_op.f('ix_sku_master_sku'))
        batch_op.drop_column('organization_id')
        batch_op.create_index(batch_op.f('ix_sku_master_sku'), ['sku'], unique=True)

    # Reverse of step 3.
    for table in _SIMPLE_TENANT_TABLES:
        with op.batch_alter_table(table, schema=None) as batch_op:
            batch_op.drop_index(batch_op.f(f'ix_{table}_organization_id'))
            batch_op.drop_column('organization_id')

    # Reverse of step 1 (users references organizations, so drop it first).
    op.drop_table('users')
    op.drop_table('organizations')
