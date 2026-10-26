"""Checkout replay protection, inventory history, manual billing and DNS ownership."""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = depends_on = None


def upgrade():
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("idempotency_key", sa.String(100), nullable=True))
        batch.add_column(sa.Column("request_hash", sa.String(64), nullable=True))
        batch.create_unique_constraint("uq_shop_checkout_key", ["shop_id", "idempotency_key"])
    with op.batch_alter_table("order_items") as batch:
        batch.add_column(sa.Column("inventory_deducted", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.execute("""UPDATE order_items SET inventory_deducted = true WHERE
        order_id IN (SELECT id FROM orders WHERE status NOT IN ('cancelled', 'returned', 'refunded'))
        AND product_id IN (SELECT id FROM products WHERE track_inventory = true)""")
    with op.batch_alter_table("order_items") as batch:
        batch.alter_column("inventory_deducted", server_default=None)
    with op.batch_alter_table("shop_domains") as batch:
        batch.add_column(sa.Column("verification_token", sa.String(64), nullable=True))
    # Previous custom-domain verification was simulated; owners must now prove ownership.
    op.execute("UPDATE shop_domains SET verification_status='pending', routing_status='inactive', verified_at=NULL WHERE domain_type='custom_domain'")
    with op.batch_alter_table("payments") as batch:
        batch.add_column(sa.Column("plan_id", sa.String(36), nullable=True))
        batch.add_column(sa.Column("billing_interval", sa.String(20), nullable=True))
        batch.create_foreign_key("fk_payments_plan", "plans", ["plan_id"], ["id"], ondelete="RESTRICT")


def downgrade():
    raise RuntimeError("Restore a backup; hardening metadata must not be discarded")
