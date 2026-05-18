"""add is_active to contacts

Revision ID: a8d8102ff93f
Revises: ff22a270b335
Create Date: 2026-05-18 22:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8d8102ff93f'
down_revision: Union[str, Sequence[str], None] = 'ff22a270b335'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('contacts', sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('contacts', 'is_active')
