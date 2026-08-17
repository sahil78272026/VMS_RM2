"""Fix parking_violations varchar length in dev

Revision ID: c99bd40c89b4
Revises: 07d79d23e021
Create Date: 2026-08-17 15:53:37.934458

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c99bd40c89b4'
down_revision: Union[str, None] = '07d79d23e021'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure both environments have VARCHAR(20) so 'unauthorized_parking' fits.
    op.execute("ALTER TABLE parking_violations ALTER COLUMN violation_type TYPE VARCHAR(20)")


def downgrade() -> None:
    pass
