"""add big_question to digests

Revision ID: c3a1f8b92d47
Revises: bf2c37a51633
Create Date: 2026-03-18 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3a1f8b92d47'
down_revision: Union[str, None] = 'bf2c37a51633'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('digests', sa.Column('big_question', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('digests', 'big_question')
