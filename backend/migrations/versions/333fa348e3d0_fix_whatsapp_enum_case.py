"""fix_whatsapp_enum_case

Revision ID: 333fa348e3d0
Revises: 04ba8f17cb8a
Create Date: 2026-04-17 22:38:48.724361

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '333fa348e3d0'
down_revision: Union[str, Sequence[str], None] = '04ba8f17cb8a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE campaignchannel ADD VALUE 'WHATSAPP'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
