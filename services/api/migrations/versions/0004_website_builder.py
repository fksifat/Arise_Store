"""Add website types and draft/published content without replacing store data."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = depends_on = None


def upgrade():
    op.add_column('shops', sa.Column('website_type', sa.String(30), server_default='online_store', nullable=False))
    op.add_column('themes', sa.Column('website_type', sa.String(30), server_default='online_store', nullable=False))
    op.create_table('site_pages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('shop_id', sa.String(36), sa.ForeignKey('shops.id', ondelete='CASCADE'), nullable=False),
        sa.Column('kind', sa.String(10), nullable=False),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('slug', sa.String(80), nullable=False),
        sa.Column('description', sa.String(300), nullable=False),
        sa.Column('sections_json', sa.Text(), nullable=False),
        sa.Column('published_json', sa.Text()),
        sa.Column('published_slug', sa.String(80)),
        sa.Column('published_at', sa.DateTime()),
        sa.Column('revision', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('shop_id', 'kind', 'slug', name='uq_site_page_slug'),
        sa.UniqueConstraint('shop_id', 'kind', 'published_slug', name='uq_site_page_published_slug'),
        sa.CheckConstraint("kind IN ('page', 'post') AND revision >= 1", name='ck_site_page_kind_revision'),
    )
    op.create_index('ix_site_pages_shop_id', 'site_pages', ['shop_id'])


def downgrade():
    raise RuntimeError('Restore a backup instead of removing website content')
