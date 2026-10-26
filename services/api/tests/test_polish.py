from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest

from app.core.order_snapshots import read_option_snapshot
from app.models import Order, Product, ProductVariant, Shop, Subscription, User
from tests.conftest import TestingSessionLocal
from tests.test_hardening import client, store, isolated_rate_limits, checkout, payload


def option_path(store):
    return f"/api/v1/shops/{store['shop']}/products/{store['product']}/variants"


def test_option_edit_preserves_checkout_stock_and_saved_order(client, store):
    response = client.post(option_path(store), headers=store['owner'], json={
        'title': 'Blue / Medium', 'price_minor': 12500, 'stock_quantity': 4,
        'sku': 'BLUE-M', 'attributes_json': '{"size":"M"}',
    })
    assert response.status_code == 201, response.text
    option = response.json()
    path = option_path(store) + '/' + option['id']
    data = payload(store, items=[{'product_id': store['product'], 'variant_id': option['id'], 'quantity': 2}])
    order = checkout(client, store, data).json()
    assert order['items'][0]['variant_title_snapshot'] == 'Blue / Medium'
    assert order['items'][0]['variant_snapshot_json'] == '{"size":"M"}'
    stale = client.patch(path, headers=store['owner'], json={'stock_quantity': 10, 'expected_stock_quantity': 4, 'title': 'Stale title'})
    assert stale.status_code == 409
    changed = client.patch(path, headers=store['owner'], json={'title': 'Renamed option', 'price_minor': None})
    assert changed.status_code == 200 and changed.json()['stock_quantity'] == 2
    assert changed.json()['price_minor'] is None
    adjusted = client.patch(path, headers=store['owner'], json={'stock_quantity': 7, 'expected_stock_quantity': 2, 'is_active': False})
    assert adjusted.status_code == 200 and adjusted.json()['stock_quantity'] == 7
    saved = client.get(f"/api/v1/shops/{store['shop']}/orders/{order['id']}", headers=store['owner']).json()
    assert saved['items'][0]['variant_title_snapshot'] == 'Blue / Medium'
    assert saved['items'][0]['sku_snapshot'] == 'BLUE-M'
    assert saved['items'][0]['unit_price_minor'] == 12500
    tracked = client.post('/api/v1/public/orders/track', headers={'X-Shop-Slug': store['slug']}, json={'order_number': order['order_number'], 'phone': data['customer_phone']})
    assert tracked.status_code == 200 and tracked.json()['items'][0]['variant_title_snapshot'] == 'Blue / Medium'
    assert checkout(client, store, data).status_code == 400


def test_option_permissions_and_product_scope(client, store):
    path = option_path(store)
    assert client.post(path, headers=store['staff'], json={'title': 'Staff option'}).status_code == 403
    option = client.post(path, headers=store['owner'], json={'title': 'Owner option'}).json()
    assert client.patch(path + '/' + option['id'], headers=store['staff'], json={'title': 'Forbidden'}).status_code == 403
    with TestingSessionLocal() as db:
        owner = User(name='Other', email=f'other-{uuid4().hex}@example.com', password_hash='unused')
        db.add(owner); db.flush()
        other_shop = Shop(owner_user_id=owner.id, name='Other shop', slug=f'other-{uuid4().hex}')
        db.add(other_shop); db.flush()
        other = Product(shop_id=other_shop.id, name='Other product', slug='other', price_minor=10)
        same_shop = Product(shop_id=store['shop'], name='Second product', slug='second', price_minor=10)
        db.add_all([other, same_shop]); db.commit()
        other_id, same_id = other.id, same_shop.id
    base = f"/api/v1/shops/{store['shop']}/products/"
    assert client.post(base + other_id + '/variants', headers=store['owner'], json={'title': 'Cross tenant'}).status_code == 404
    assert client.patch(base + same_id + '/variants/' + option['id'], headers=store['owner'], json={'title': 'Wrong product'}).status_code == 404
    assert client.delete(base + store['product'], headers=store['owner']).status_code == 204
    assert client.post(path, headers=store['owner'], json={'title': 'Archived'}).status_code == 404


@pytest.mark.parametrize('changes', [
    {'stock_quantity': 3}, {'stock_quantity': None}, {'expected_stock_quantity': None},
    {'stock_quantity': -1, 'expected_stock_quantity': 0}, {'is_active': None},
    {'title': None}, {'title': '   '}, {'price_minor': -1}, {'sku': 'x' * 101},
])
def test_invalid_option_changes_do_not_write(client, store, changes):
    created = client.post(option_path(store), headers=store['owner'], json={'title': 'Original'}).json()
    response = client.patch(option_path(store) + '/' + created['id'], headers=store['owner'], json=changes)
    assert response.status_code == 422, response.text
    with TestingSessionLocal() as db:
        option = db.get(ProductVariant, created['id'])
        assert option.title == 'Original' and option.stock_quantity == 0


def test_legacy_option_snapshots_are_returned_unchanged():
    for value in [None, '{"size":"M"}', 'unparseable legacy data', '{"title":"Not a snapshot"}']:
        assert read_option_snapshot(value) == (None, value)


def test_option_count_is_bounded_on_create_and_append(client, store):
    with TestingSessionLocal() as db:
        db.add_all(ProductVariant(product_id=store['product'], title=f'Option {index}') for index in range(100))
        db.commit()
    assert client.post(option_path(store), headers=store['owner'], json={'title': 'Over limit'}).status_code == 400
    response = client.post(f"/api/v1/shops/{store['shop']}/products", headers=store['owner'], json={
        'name': 'Too many options', 'price_minor': 10, 'variants': [{'title': 'Option'}] * 101,
    })
    assert response.status_code == 422
    with TestingSessionLocal() as db:
        assert db.query(ProductVariant).filter(ProductVariant.product_id == store['product']).count() == 100


def test_option_order_stays_in_creation_order_after_stock_updates(client, store):
    with TestingSessionLocal() as db:
        now = datetime.now(timezone.utc)
        # Insert in reverse order to ensure the query orders by creation time.
        second = ProductVariant(product_id=store['product'], title='Second', stock_quantity=2, created_at=now)
        first = ProductVariant(product_id=store['product'], title='First', stock_quantity=2, created_at=now-timedelta(seconds=1))
        db.add_all([second, first]); db.commit()
        first_id = first.id
    path = f"/api/v1/shops/{store['shop']}/products/{store['product']}"
    assert [option['title'] for option in client.get(path, headers=store['owner']).json()['variants']] == ['First', 'Second']
    assert client.patch(path + '/variants/' + first_id, headers=store['owner'], json={'stock_quantity': 1, 'expected_stock_quantity': 2}).status_code == 200
    public = client.get('/api/v1/public/products', headers={'X-Shop-Slug': store['slug']})
    assert public.status_code == 200
    assert [option['title'] for option in public.json()[0]['variants']] == ['First', 'Second']


def test_admin_metrics_count_delivered_value_and_unexpired_plans(client, store):
    before = client.get('/api/v1/admin/metrics', headers=store['admin']).json()
    with TestingSessionLocal() as db:
        sub = db.query(Subscription).filter(Subscription.shop_id == store['shop']).one()
        monthly = sub.plan.price_monthly_minor
        sub.current_period_end = datetime.now(timezone.utc) - timedelta(days=1)
        for status, total in [('pending', 50000), ('delivered', 12500), ('cancelled', 8000), ('returned', 9000)]:
            db.add(Order(shop_id=store['shop'], order_number=uuid4().hex, status=status, total_minor=total,
                         customer_name='Buyer', customer_phone='01712345678', shipping_city='Dhaka', shipping_address='Road 1'))
        db.commit()
    after = client.get('/api/v1/admin/metrics', headers=store['admin']).json()
    assert after['total_orders'] == before['total_orders'] + 4
    assert after['total_revenue_minor'] == before['total_revenue_minor'] + 12500
    assert after['mrr_estimate_minor'] == before['mrr_estimate_minor'] - monthly
