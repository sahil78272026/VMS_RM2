"""Add multi-tenancy support with societies, society_admins, and scoped tables

Revision ID: e1a2b3c4d5f6
Revises: de133dcac7da
Create Date: 2026-08-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM as pgEnum


# revision identifiers, used by Alembic.
revision: str = 'e1a2b3c4d5f6'
down_revision: Union[str, None] = 'de133dcac7da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update user_role enum if needed to support super_admin
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';")

    # 2. Create society_status enum safely if not exists
    op.execute("DO $$ BEGIN CREATE TYPE society_status AS ENUM ('trial', 'active', 'suspended'); EXCEPTION WHEN duplicate_object THEN null; END $$;")

    op.create_table(
        'societies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False, unique=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('total_flats', sa.Integer(), nullable=True),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('status', pgEnum('trial', 'active', 'suspended', name='society_status', create_type=False), server_default='active', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_societies_slug', 'societies', ['slug'], unique=True)

    # 3. Create society_admins table
    op.create_table(
        'society_admins',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('society_id', sa.Integer(), sa.ForeignKey('societies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.UniqueConstraint('society_id', 'user_id', name='uq_society_admin')
    )

    # 4. Add is_super_admin to users
    op.add_column('users', sa.Column('is_super_admin', sa.Boolean(), server_default='false', nullable=False))

    # 5. Insert default initial society (RM2 Residency) if no societies exist
    op.execute(
        "INSERT INTO societies (id, name, slug, address, city, total_flats, status, created_at) "
        "VALUES (1, 'RM2 Residency', 'rm2-residency', 'Main Street, Sector 1', 'New Delhi', 256, 'active', now()) "
        "ON CONFLICT (id) DO NOTHING;"
    )

    # 6. Add society_id column to scoped tables
    scoped_tables = [
        ('gates', False),
        ('flats', False),
        ('flat_users', False),
        ('guards', False),
        ('visitors', False),
        ('visitor_logs', False),
        ('pre_approvals', False),
        ('frequent_passes', False),
        ('gate_sessions', False),
        ('panic_alerts', False),
        ('maintenance_bills', False),
        ('maintenance_payments', False),
        ('announcements', False),
        ('notifications', True),  # nullable
    ]

    for table_name, is_nullable in scoped_tables:
        op.add_column(
            table_name,
            sa.Column(
                'society_id',
                sa.Integer(),
                sa.ForeignKey('societies.id', ondelete='CASCADE'),
                nullable=is_nullable,
                server_default='1' if not is_nullable else None
            )
        )

    # 7. Update unique constraints
    # Remove global unique constraint on flats.flat_number and replace with (society_id, flat_number)
    try:
        op.drop_constraint('flats_flat_number_key', 'flats', type_='unique')
    except Exception:
        pass
    op.create_unique_constraint('uq_flat_society_number', 'flats', ['society_id', 'flat_number'])

    # Remove global unique on guards.employee_id and replace with (society_id, employee_id)
    try:
        op.drop_constraint('guards_employee_id_key', 'guards', type_='unique')
    except Exception:
        pass
    op.create_unique_constraint('uq_guard_society_employee', 'guards', ['society_id', 'employee_id'])

    # Compound constraints for other scoped tables
    op.create_unique_constraint('uq_gate_society_name', 'gates', ['society_id', 'name'])
    op.create_unique_constraint('uq_visitor_society_phone', 'visitors', ['society_id', 'phone'])
    op.create_unique_constraint('uq_flat_user_society', 'flat_users', ['society_id', 'user_id', 'flat_id'])
    op.create_unique_constraint('uq_bill_society_flat_period', 'maintenance_bills', ['society_id', 'flat_id', 'bill_period'])


def downgrade() -> None:
    # Drop constraints
    op.drop_constraint('uq_bill_society_flat_period', 'maintenance_bills', type_='unique')
    op.drop_constraint('uq_flat_user_society', 'flat_users', type_='unique')
    op.drop_constraint('uq_visitor_society_phone', 'visitors', type_='unique')
    op.drop_constraint('uq_gate_society_name', 'gates', type_='unique')
    op.drop_constraint('uq_guard_society_employee', 'guards', type_='unique')
    op.drop_constraint('uq_flat_society_number', 'flats', type_='unique')

    # Re-add single-society unique constraints
    op.create_unique_constraint('guards_employee_id_key', 'guards', ['employee_id'])
    op.create_unique_constraint('flats_flat_number_key', 'flats', ['flat_number'])

    # Drop society_id columns
    scoped_tables = [
        'notifications', 'announcements', 'maintenance_payments', 'maintenance_bills',
        'panic_alerts', 'gate_sessions', 'frequent_passes', 'pre_approvals',
        'visitor_logs', 'visitors', 'guards', 'flat_users', 'flats', 'gates'
    ]
    for table_name in scoped_tables:
        op.drop_column(table_name, 'society_id')

    # Drop users.is_super_admin
    op.drop_column('users', 'is_super_admin')

    # Drop society_admins and societies
    op.drop_table('society_admins')
    op.drop_index('ix_societies_slug', 'societies')
    op.drop_table('societies')
    sa.Enum(name='society_status').drop(op.get_bind(), checkfirst=True)
