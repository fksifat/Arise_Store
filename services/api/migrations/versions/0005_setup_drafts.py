"""Save incomplete website setup per account."""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('setup_drafts',
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('data_json', sa.Text(), nullable=False))


def downgrade():
    op.drop_table('setup_drafts')
