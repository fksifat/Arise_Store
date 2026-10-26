"""Reject invalid monetary and inventory values at the database boundary."""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = depends_on = None


def upgrade():
    checks = {
        "products": ("ck_product_nonnegative", "price_minor >= 0 AND stock_quantity >= 0"),
        "product_variants": ("ck_variant_nonnegative", "(price_minor IS NULL OR price_minor >= 0) AND stock_quantity >= 0"),
        "orders": ("ck_order_nonnegative", "subtotal_minor >= 0 AND delivery_fee_minor >= 0 AND discount_minor >= 0 AND total_minor >= 0"),
        "order_items": ("ck_order_item_amounts", "unit_price_minor >= 0 AND quantity > 0 AND line_total_minor >= 0"),
    }
    for table, (name, expression) in checks.items():
        with op.batch_alter_table(table) as batch:
            batch.create_check_constraint(name, expression)


def downgrade():
    raise RuntimeError("Restore a backup instead of removing integrity constraints")
