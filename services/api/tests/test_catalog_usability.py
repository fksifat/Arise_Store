from app.models import Product, ProductImage, ProductVariant, Category, ProductCategory
from tests.conftest import TestingSessionLocal
from tests.test_hardening import store, client, isolated_rate_limits, checkout, payload


def test_edit_keeps_variants_and_order_snapshots(client, store):
    old_url = 'https://example.com/original.jpg'
    with TestingSessionLocal() as db:
        product = db.get(Product, store['product'])
        product.images = [ProductImage(image_url=old_url, is_primary=True, sort_order=0), ProductImage(image_url='https://example.com/detail.jpg', sort_order=1)]
        product.variants = [ProductVariant(title='Medium', stock_quantity=4, price_minor=14000)]
        db.commit()
        variant_id = product.variants[0].id
    order = checkout(client, store, payload(store, items=[{'product_id':store['product'], 'variant_id':variant_id, 'quantity':1}]))
    assert order.status_code == 201
    path = f"/api/v1/shops/{store['shop']}/products/{store['product']}"
    changed = client.patch(path, headers=store['owner'], json={'name':'Updated Product','price_minor':29,'sku':None,'compare_at_price_minor':None,'images':[{'image_url':'https://example.com/new.jpg','is_primary':True},{'image_url':'https://example.com/detail.jpg','sort_order':1}]})
    assert changed.status_code == 200, changed.text
    assert changed.json()['price_minor'] == 29
    assert len(changed.json()['images']) == 2
    assert changed.json()['variants'][0]['id'] == variant_id
    assert changed.json()['variants'][0]['stock_quantity'] == 3
    snapshot = client.get(f"/api/v1/shops/{store['shop']}/orders/{order.json()['id']}", headers=store['owner']).json()['items'][0]
    assert snapshot['product_image_url_snapshot'] == old_url
    assert snapshot['product_name_snapshot'] == 'Test Product'
    assert snapshot['unit_price_minor'] == 14000
    assert client.patch(path, headers=store['owner'], json={'images':None}).status_code == 422
    assert client.patch(path, headers=store['owner'], json={'images':[]}).json()['images'] == []


def test_stale_inventory_edit_does_not_change_stock_or_images(client, store):
    with TestingSessionLocal() as db:
        product = db.get(Product, store['product'])
        product.stock_quantity = 2
        product.images = [ProductImage(image_url='https://example.com/old.jpg', is_primary=True)]
        db.commit()
    path = f"/api/v1/shops/{store['shop']}/products/{store['product']}"
    response = client.patch(path, headers=store['owner'], json={'stock_quantity':9,'expected_stock_quantity':5,'images':[{'image_url':'https://example.com/new.jpg'}]})
    assert response.status_code == 409
    saved = client.get(path, headers=store['owner']).json()
    assert saved['stock_quantity'] == 2
    assert saved['images'][0]['image_url'] == 'https://example.com/old.jpg'
    assert client.patch(path, headers=store['owner'], json={'stock_quantity':9,'expected_stock_quantity':2}).json()['stock_quantity'] == 9


def test_product_search_and_invalid_category_filter(client, store):
    with TestingSessionLocal() as db:
        product = db.get(Product, store['product']); product.sku = 'SKU-ONLY-42'
        archived = Category(shop_id=store['shop'], name='Archived', slug='archived', status='archived')
        db.add(archived); db.flush()
        db.add(ProductCategory(product_id=product.id, category_id=archived.id)); db.commit()
    public_headers = {'X-Shop-Slug':store['slug']}
    assert client.get('/api/v1/public/products?search=sku-only-42', headers=public_headers).json()[0]['id'] == store['product']
    assert client.get(f"/api/v1/shops/{store['shop']}/products?search=SKU-ONLY-42", headers=store['owner']).json()[0]['id'] == store['product']
    assert client.get('/api/v1/public/products?category_slug=missing', headers=public_headers).json() == []
    assert client.get('/api/v1/public/products?category_slug=archived', headers=public_headers).json() == []
