"""add design to campaigns

Revision ID: 87f61c3132e0
Revises: 19ea359d47bd
Create Date: 2026-05-23 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '87f61c3132e0'
down_revision: Union[str, Sequence[str], None] = '19ea359d47bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('campaigns', sa.Column('design', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('campaigns', 'design')
