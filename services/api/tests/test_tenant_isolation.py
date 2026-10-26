import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.models.shop import Shop, ShopMembership
from app.core.security import hash_password, create_access_token
from tests.conftest import TestingSessionLocal

@pytest.fixture(scope="module", autouse=True)
def init_tenant_data():
    db = TestingSessionLocal()

    # Create Merchant A and Shop A
    user_a = User(name="Merchant A", email="merch_a@example.com", password_hash=hash_password("pass123"), role="merchant")
    db.add(user_a)
    db.flush()

    shop_a = Shop(owner_user_id=user_a.id, name="Shop A", slug="shop-a", status="published")
    db.add(shop_a)
    db.flush()
    db.add(ShopMembership(shop_id=shop_a.id, user_id=user_a.id, role="owner", status="active"))

    # Create Merchant B and Shop B
    user_b = User(name="Merchant B", email="merch_b@example.com", password_hash=hash_password("pass123"), role="merchant")
    db.add(user_b)
    db.flush()

    shop_b = Shop(owner_user_id=user_b.id, name="Shop B", slug="shop-b", status="published")
    db.add(shop_b)
    db.flush()
    db.add(ShopMembership(shop_id=shop_b.id, user_id=user_b.id, role="owner", status="active"))

    db.commit()
    db.close()

client = TestClient(app)

def test_tenant_isolation_products():
    db = TestingSessionLocal()
    user_a = db.query(User).filter(User.email == "merch_a@example.com").first()
    user_b = db.query(User).filter(User.email == "merch_b@example.com").first()
    shop_a = db.query(Shop).filter(Shop.slug == "shop-a").first()

    token_a = create_access_token(subject=user_a.id)
    token_b = create_access_token(subject=user_b.id)

    # Merchant A creates a product in Shop A
    resp = client.post(
        f"/api/v1/shops/{shop_a.id}/products",
        json={"name": "Secret A Item", "price_minor": 10000, "stock_quantity": 5},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 201
    prod_a_id = resp.json()["id"]

    # Merchant B tries to read products of Shop A -> MUST BE 403
    resp_b_list = client.get(
        f"/api/v1/shops/{shop_a.id}/products",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp_b_list.status_code == 403
    assert "permission" in resp_b_list.json()["detail"].lower()

    # Merchant B tries to modify Shop A's product -> MUST BE 403
    resp_b_edit = client.patch(
        f"/api/v1/shops/{shop_a.id}/products/{prod_a_id}",
        json={"name": "Hacked Name"},
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp_b_edit.status_code == 403

    # Merchant B tries to delete Shop A's product -> MUST BE 403
    resp_b_del = client.delete(
        f"/api/v1/shops/{shop_a.id}/products/{prod_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp_b_del.status_code == 403
    db.close()

def test_tenant_isolation_orders():
    db = TestingSessionLocal()
    user_b = db.query(User).filter(User.email == "merch_b@example.com").first()
    shop_a = db.query(Shop).filter(Shop.slug == "shop-a").first()
    token_b = create_access_token(subject=user_b.id)

    # Merchant B tries to read orders of Shop A -> MUST BE 403
    resp = client.get(
        f"/api/v1/shops/{shop_a.id}/orders",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 403
    db.close()

def test_slug_uniqueness_and_reserved_words():
    db = TestingSessionLocal()
    user_a = db.query(User).filter(User.email == "merch_a@example.com").first()
    token_a = create_access_token(subject=user_a.id)

    # Try to create a shop with reserved word "admin"
    resp = client.post(
        "/api/v1/shops",
        json={"name": "Admin Store", "slug": "admin"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp.status_code == 422 or resp.status_code == 400

    # Try to create duplicate slug "shop-a"
    resp_dup = client.post(
        "/api/v1/shops",
        json={"name": "Duplicate Shop", "slug": "shop-a"},
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert resp_dup.status_code == 400
    assert "already taken" in resp_dup.json()["detail"].lower()
    db.close()

