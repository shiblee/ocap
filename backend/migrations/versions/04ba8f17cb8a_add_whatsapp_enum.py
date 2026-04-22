"""add_whatsapp_enum

Revision ID: 04ba8f17cb8a
Revises: efe04dad4a0d
Create Date: 2026-04-17 22:32:44.416409

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '04ba8f17cb8a'
down_revision: Union[str, Sequence[str], None] = 'efe04dad4a0d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE campaignchannel ADD VALUE 'whatsapp'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
