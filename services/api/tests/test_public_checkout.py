import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.shop import Shop, ShopMembership
from app.models.catalog import Product
from app.models.theme import Theme, ShopThemeSetting
from app.core.security import hash_password, create_access_token
from tests.conftest import TestingSessionLocal

@pytest.fixture(scope="module", autouse=True)
def init_checkout_data():
    db = TestingSessionLocal()

    user = User(name="Merchant One", email="owner@test.com", password_hash=hash_password("pass123"), role="merchant")
    db.add(user)
    db.flush()

    shop = Shop(
        owner_user_id=user.id,
        name="Test Store",
        slug="test-store",
        status="published",
        inside_dhaka_delivery_fee_minor="6000",
        outside_dhaka_delivery_fee_minor="12000"
    )
    db.add(shop)
    db.flush()
    db.add(ShopMembership(shop_id=shop.id, user_id=user.id, role="owner", status="active"))

    theme = Theme(
        theme_key="fashion-modern-test",
        name="Fashion Modern Test",
        version="1.0.0",
        configuration_schema="{}",
        is_active=True
    )
    db.add(theme)
    db.flush()

    db.add(ShopThemeSetting(
        shop_id=shop.id,
        theme_id=theme.id,
        theme_version=theme.version,
        settings_json='{"brand": {"primary_color": "#111827"}}'
    ))

    # Product with 10 units in stock at ৳1,500 (150000 poisha)
    p = Product(
        shop_id=shop.id,
        name="Original Silk Shirt",
        slug="original-silk-shirt",
        price_minor=150000,
        currency="BDT",
        sku="SKU-SILK-01",
        stock_quantity=10,
        track_inventory=True,
        status="active"
    )
    db.add(p)

    db.commit()
    db.close()

client = TestClient(app)

def test_public_store_endpoint():
    resp = client.get("/api/v1/public/store", headers={"X-Shop-Slug": "test-store"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Store"
    assert data["slug"] == "test-store"
    assert data["theme"]["theme_key"] == "fashion-modern-test"

def test_cod_checkout_and_snapshot_immutability():
    db = TestingSessionLocal()
    shop = db.query(Shop).filter(Shop.slug == "test-store").first()
    product = db.query(Product).filter(Product.shop_id == shop.id).first()
    initial_stock = product.stock_quantity

    # 1. Place Order via Guest COD checkout
    checkout_payload = {
        "customer_name": "Karim Ullah",
        "customer_phone": "01812345678",
        "customer_email": "karim@example.com",
        "shipping_city": "Dhaka",
        "shipping_address": "House 10, Road 4, Sector 3, Uttara, Dhaka",
        "customer_note": "Ring doorbell",
        "payment_method": "cod",
        "items": [
            {
                "product_id": product.id,
                "quantity": 2
            }
        ]
    }

    order_resp = client.post(
        "/api/v1/public/orders",
        json=checkout_payload,
        headers={"X-Shop-Slug": "test-store", "Idempotency-Key": "legacy-checkout-test-001"}
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()

    assert order_data["customer_name"] == "Karim Ullah"
    assert order_data["payment_method"] == "cod"
    assert order_data["payment_status"] == "unpaid"
    assert order_data["subtotal_minor"] == 300000  # 2 * 150000
    assert order_data["delivery_fee_minor"] == 6000  # Dhaka delivery fee
    assert order_data["total_minor"] == 306000
    assert len(order_data["items"]) == 1
    assert order_data["items"][0]["product_name_snapshot"] == "Original Silk Shirt"
    assert order_data["items"][0]["unit_price_minor"] == 150000

    order_id = order_data["id"]

    # 2. Check stock decremented
    db.refresh(product)
    assert product.stock_quantity == initial_stock - 2

    # 3. Simulate Merchant modifying product name and price later
    product.name = "Discounted Polyester Shirt"
    product.price_minor = 50000  # price lowered to ৳500
    db.commit()

    # 4. Verify historical order snapshot remained completely UNTOUCHED
    user = db.query(User).filter(User.email == "owner@test.com").first()
    token = create_access_token(subject=user.id)

    order_fetch = client.get(
        f"/api/v1/shops/{shop.id}/orders/{order_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert order_fetch.status_code == 200
    fetched_order = order_fetch.json()
    item_snapshot = fetched_order["items"][0]

    # Crucial acceptance criterion: product edit must NOT change historical order!
    assert item_snapshot["product_name_snapshot"] == "Original Silk Shirt"
    assert item_snapshot["unit_price_minor"] == 150000
    assert item_snapshot["line_total_minor"] == 300000
    db.close()

