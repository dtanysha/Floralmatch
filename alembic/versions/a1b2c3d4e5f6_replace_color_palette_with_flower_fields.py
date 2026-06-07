"""replace color_palette with flower_type and flower_color

Revision ID: a1b2c3d4e5f6
Revises: 07858e4ef3ff
Create Date: 2026-04-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '07858e4ef3ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'products',
        sa.Column('flower_type', sa.String(length=50), nullable=True),
    )
    op.add_column(
        'products',
        sa.Column('flower_color', sa.String(length=50), nullable=True),
    )
    op.drop_column('products', 'color_palette')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        'products',
        sa.Column('color_palette', sa.String(length=50), nullable=True),
    )
    op.drop_column('products', 'flower_color')
    op.drop_column('products', 'flower_type')
