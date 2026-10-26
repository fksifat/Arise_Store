from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from starlette.requests import Request
from sqlalchemy import event
from app.main import app
from app.config import settings, Settings
from app.core import middleware
from app.core.security import create_access_token, hash_password
from app.core.tenant import resolve_public_tenant
from app.models import User, Shop, ShopMembership, ShopDomain, Product, ProductVariant, Plan, Subscription, Order, Payment, Category
from app.schemas.catalog import ProductVariantCreate, ProductUpdate, CategoryUpdate
from app.schemas.shop import ShopUpdate
from tests.conftest import TestingSessionLocal, engine


@pytest.fixture(autouse=True)
def isolated_rate_limits(monkeypatch):
    middleware._counts.clear()
    monkeypatch.setattr(settings, 'REDIS_URL', '')


@pytest.fixture
def store():
    with TestingSessionLocal() as db:
        suffix = uuid4().hex
        user = User(name='Owner', email=f'{suffix}@example.com', password_hash=hash_password('a-secure-password'), role='merchant')
        admin = User(name='Admin', email=f'admin-{suffix}@example.com', password_hash=hash_password('a-secure-password'), role='platform_admin')
        staff = User(name='Staff', email=f'staff-{suffix}@example.com', password_hash=hash_password('a-secure-password'), role='merchant')
        db.add_all([user, admin, staff]); db.flush()
        shop = Shop(owner_user_id=user.id, name='Hardening Store', slug=f's-{suffix}', status='published')
        db.add(shop); db.flush()
        db.add_all([ShopMembership(shop_id=shop.id, user_id=user.id, role='owner'), ShopMembership(shop_id=shop.id, user_id=staff.id, role='staff')])
        plan = db.query(Plan).filter(Plan.slug == 'growth').one()
        db.add(Subscription(shop_id=shop.id, plan_id=plan.id, status='active', current_period_end=datetime.now(timezone.utc) + timedelta(days=30)))
        prod = Product(shop_id=shop.id, name='Test Product', slug='test-product', price_minor=10000, stock_quantity=5, status='active')
        db.add(prod); db.commit()
        return {'shop': shop.id, 'slug': shop.slug, 'product': prod.id, 'email': user.email,
                'owner': {'Authorization': f'Bearer {create_access_token(user.id)}'},
                'admin': {'Authorization': f'Bearer {create_access_token(admin.id)}'},
                'staff': {'Authorization': f'Bearer {create_access_token(staff.id)}'}}


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client


def payload(store, **changes):
    result = dict(customer_name='Test Customer', customer_phone='01712345678', shipping_city='Dhaka', shipping_address='Road 10, Dhaka', payment_method='cod', items=[{'product_id': store['product'], 'quantity': 2}])
    result.update(changes)
    return result


def checkout(client, store, data=None, key=None):
    return client.post('/api/v1/public/orders', json=data or payload(store), headers={'X-Shop-Slug': store['slug'], 'Idempotency-Key': key or uuid4().hex})


def test_checkout_replay_and_payload_conflict(client, store):
    key = uuid4().hex
    first = checkout(client, store, key=key)
    assert first.status_code == 201, first.text
    replay = checkout(client, store, key=key)
    assert replay.status_code == 201 and replay.json()['id'] == first.json()['id']
    assert checkout(client, store, payload(store, customer_name='Changed'), key).status_code == 409
    with TestingSessionLocal() as db:
        assert db.get(Product, store['product']).stock_quantity == 3
        assert db.query(Order).filter(Order.shop_id == store['shop']).count() == 1


def test_checkout_rolls_back_when_later_line_fails(client, store):
    data = payload(store)
    data['items'].append({'product_id': 'zzzz-missing', 'quantity': 1})
    assert checkout(client, store, data).status_code == 400
    with TestingSessionLocal() as db:
        assert db.get(Product, store['product']).stock_quantity == 5
        assert db.query(Order).filter(Order.shop_id == store['shop']).count() == 0


def test_duplicate_lines_cannot_oversell(client, store):
    data = payload(store, items=[{'product_id': store['product'], 'quantity': 3}] * 2)
    quote = client.post('/api/v1/public/cart/validate', json={'items': data['items'], 'shipping_city': 'Dhaka'}, headers={'X-Shop-Slug': store['slug']})
    assert quote.status_code == 200 and quote.json()['all_in_stock'] is False
    assert len(quote.json()['items']) == 1
    assert checkout(client, store, data).status_code == 409
    with TestingSessionLocal() as db:
        assert db.get(Product, store['product']).stock_quantity == 5


@pytest.mark.parametrize('changes', [{'payment_method': 'bkash'}, {'payment_method': 'anything'}, {'shipping_city': 'unknown'}, {'items': []}])
def test_invalid_checkout_inputs(client, store, changes):
    assert checkout(client, store, payload(store, **changes)).status_code == 422


def test_stale_price_rolls_back(client, store):
    assert checkout(client, store, payload(store, expected_total_minor=1)).status_code == 409
    with TestingSessionLocal() as db:
        assert db.get(Product, store['product']).stock_quantity == 5


def test_invalid_variant_and_missing_product_rejected_in_quote(client, store):
    for item in [{'product_id': store['product'], 'variant_id': 'missing', 'quantity': 1}, {'product_id': 'missing', 'quantity': 1}]:
        response = client.post('/api/v1/public/cart/validate', json={'items': [item], 'shipping_city': 'Dhaka'}, headers={'X-Shop-Slug': store['slug']})
        assert response.status_code == 400


def test_variant_cancellation_restocks_once_and_terminal_state(client, store):
    with TestingSessionLocal() as db:
        variant = ProductVariant(product_id=store['product'], title='Small', stock_quantity=4, price_minor=12000)
        db.add(variant); db.commit(); variant_id = variant.id
    data = payload(store, items=[{'product_id': store['product'], 'variant_id': variant_id, 'quantity': 2}])
    response = checkout(client, store, data)
    assert response.status_code == 201, response.text
    path = f"/api/v1/shops/{store['shop']}/orders/{response.json()['id']}/status"
    for _ in range(2):
        assert client.patch(path, json={'status': 'cancelled'}, headers=store['owner']).status_code == 200
    assert client.patch(path, json={'status': 'confirmed'}, headers=store['owner']).status_code == 409
    with TestingSessionLocal() as db:
        assert db.get(Product, store['product']).stock_quantity == 5
        assert db.get(ProductVariant, variant_id).stock_quantity == 4


def test_order_transitions_and_public_notes(client, store):
    response = checkout(client, store)
    number, order_id = response.json()['order_number'], response.json()['id']
    path = f"/api/v1/shops/{store['shop']}/orders/{order_id}/status"
    assert client.patch(path, json={'status': 'delivered'}, headers=store['owner']).status_code == 409
    for status in ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'delivered']:
        result = client.patch(path, json={'status': status, 'admin_note': 'INTERNAL ONLY'}, headers=store['owner'])
        assert result.status_code == 200, result.text
    assert result.json()['payment_status'] == 'paid'
    for phone, expected in [('01712345678', 200), ('+8801712345678', 200), ('8', 404), ('01812345678', 404), ('', 404)]:
        result = client.post('/api/v1/public/orders/track', json={'order_number': number, 'phone': phone}, headers={'X-Shop-Slug': store['slug']})
        assert result.status_code in ([422, 404] if expected == 404 else [expected])
        assert 'admin_note' not in result.json()


def test_moderation_and_roles(client, store):
    path = f"/api/v1/shops/{store['shop']}"
    assert client.patch(path, json={'name': 'Changed'}, headers=store['staff']).status_code == 403
    assert client.post(path + '/publish', headers=store['staff']).status_code == 403
    assert client.post(path + '/subscriptions/upgrade', json={'plan_slug': 'premium', 'payment_method': 'manual'}, headers=store['staff']).status_code == 403
    assert client.patch(f"/api/v1/admin/shops/{store['shop']}/status", json={'status': 'suspended', 'reason': 'Policy violation'}, headers=store['admin']).status_code == 200
    assert client.post(path + '/publish', headers=store['owner']).status_code == 403
    assert client.post(path + '/unpublish', headers=store['owner']).status_code == 403
    assert checkout(client, store).status_code == 403


def test_expired_subscription_blocks_checkout_and_product_creation(client, store):
    with TestingSessionLocal() as db:
        sub = db.query(Subscription).filter(Subscription.shop_id == store['shop']).one()
        sub.current_period_end = datetime.now(timezone.utc) - timedelta(days=1); db.commit()
    assert checkout(client, store).status_code == 403
    assert client.post(f"/api/v1/shops/{store['shop']}/products", json={'name': 'New', 'price_minor': 100}, headers=store['owner']).status_code == 403


def test_custom_hostname_cannot_bypass_moderation(store):
    with TestingSessionLocal() as db:
        shop = db.get(Shop, store['shop']); shop.status = 'suspended'
        hostname = f"{uuid4().hex}.example.com"
        db.add(ShopDomain(shop_id=shop.id, hostname=hostname, verification_status='verified', routing_status='active')); db.commit()
        request = Request({'type': 'http', 'method': 'GET', 'path': '/api/v1/public/store', 'query_string': b'', 'headers': [(b'host', hostname.encode())]})
        with pytest.raises(HTTPException) as error:
            resolve_public_tenant(request, db, None)
        assert error.value.status_code == 403


def test_billing_requires_real_admin_confirmation(client, store):
    path = f"/api/v1/shops/{store['shop']}/subscriptions/upgrade"
    data = {'plan_slug': 'premium', 'payment_method': 'manual'}
    response = client.post(path, json=data, headers=store['owner'])
    assert response.status_code == 202, response.text
    payment_id = response.json()['id']
    assert response.json()['status'] == 'pending' and response.json()['verified_at'] is None
    assert client.post(path, json=data, headers=store['owner']).json()['id'] == payment_id
    with TestingSessionLocal() as db:
        sub = db.query(Subscription).filter(Subscription.shop_id == store['shop']).one()
        growth = db.query(Plan).filter(Plan.slug == 'growth').one()
        assert sub.plan_id == growth.id
    confirm = f'/api/v1/admin/payments/{payment_id}/verify'
    body = {'provider_reference': uuid4().hex, 'reason': 'Verified money in bank account'}
    assert client.post(confirm, json=body, headers=store['owner']).status_code == 403
    verified = client.post(confirm, json=body, headers=store['admin'])
    assert verified.status_code == 200 and verified.json()['status'] == 'completed'
    with TestingSessionLocal() as db:
        sub = db.query(Subscription).filter(Subscription.shop_id == store['shop']).one()
        premium = db.query(Plan).filter(Plan.slug == 'premium').one()
        assert sub.plan_id == premium.id
        old_end = sub.current_period_end
    assert client.post(confirm, json=body, headers=store['admin']).status_code == 200
    with TestingSessionLocal() as db:
        assert db.query(Subscription).filter(Subscription.shop_id == store['shop']).one().current_period_end == old_end


def test_domain_requires_matching_txt_and_plan(client, store, monkeypatch):
    import dns.resolver
    path = f"/api/v1/shops/{store['shop']}/domains"
    response = client.post(path, json={'hostname': f'{uuid4().hex}.example.com'}, headers=store['owner'])
    assert response.status_code == 201, response.text
    data = response.json()
    assert data['routing_status'] == 'inactive' and data['verification_value'].startswith('arise=')
    class TXT:
        strings = [b'wrong']
    monkeypatch.setattr(dns.resolver, 'resolve', lambda *a, **kw: [TXT()])
    assert client.post(f"{path}/{data['id']}/verify", headers=store['owner']).status_code == 409
    TXT.strings = [data['verification_value'].encode()]
    verified = client.post(f"{path}/{data['id']}/verify", headers=store['owner'])
    assert verified.status_code == 200 and verified.json()['verification_status'] == 'verified'
    assert verified.json()['routing_status'] == 'inactive'
    with TestingSessionLocal() as db:
        sub = db.query(Subscription).filter(Subscription.shop_id == store['shop']).one()
        sub.plan_id = db.query(Plan).filter(Plan.slug == 'starter').one().id; db.commit()
    assert client.post(path, json={'hostname': 'another.example.com'}, headers=store['owner']).status_code == 403


def test_category_tenant_parent_and_cycles(client, store):
    path = f"/api/v1/shops/{store['shop']}/categories"
    with TestingSessionLocal() as db:
        other_shop = Shop(owner_user_id=db.get(Shop, store['shop']).owner_user_id, name='Other', slug=uuid4().hex)
        db.add(other_shop); db.flush()
        other = Category(shop_id=other_shop.id, name='Other', slug='other'); db.add(other); db.commit(); other_id=other.id
    assert client.post(path, json={'name': 'Child', 'parent_id': other_id}, headers=store['owner']).status_code == 400
    first = client.post(path, json={'name': 'First'}, headers=store['owner']).json()
    second = client.post(path, json={'name': 'Second', 'parent_id': first['id']}, headers=store['owner']).json()
    assert client.patch(path + '/' + first['id'], json={'parent_id': second['id']}, headers=store['owner']).status_code == 400


@pytest.mark.parametrize('schema,values', [(ProductVariantCreate, {'title':'Small','price_minor':-1}), (ProductVariantCreate, {'title':'Small','stock_quantity':-1}), (ProductUpdate, {'price_minor': None}), (ProductUpdate, {'name': None}), (CategoryUpdate, {'status':None}), (ShopUpdate, {'inside_dhaka_delivery_fee_minor':'-1'}), (ShopUpdate, {'inside_dhaka_delivery_fee_minor':None})])
def test_schema_boundaries(schema, values):
    with pytest.raises(ValidationError):
        schema(**values)


def test_production_configuration_fails_closed():
    with pytest.raises(ValidationError):
        Settings(APP_ENV='production', _env_file=None)
    valid = dict(APP_ENV='production', APP_DEBUG=False, SECRET_KEY=uuid4().hex+uuid4().hex, COOKIE_SECURE=True,
        DATABASE_URL='postgresql+psycopg://app:pass@localhost/arise', REDIS_URL='redis://localhost:6379',
        ALLOWED_ORIGINS=['https://example.com'], ALLOWED_HOSTS=['example.com'])
    assert Settings(**valid, _env_file=None).APP_ENV == 'production'
    for changes in [dict(SEED_DEMO_DATA=True), dict(AUTO_CREATE_TABLES=True), dict(ALLOWED_ORIGINS=['*']), dict(COOKIE_SECURE=False)]:
        with pytest.raises(ValidationError):
            Settings(**(valid | changes), _env_file=None)


def test_cookie_login_origin_and_logout(client, store):
    data = {'email': store['email'], 'password':'a-secure-password'}
    assert client.post('/api/v1/auth/login', json=data, headers={'Origin':'https://evil.example'}).status_code == 403
    response = client.post('/api/v1/auth/login', json=data, headers={'Origin':'http://localhost:3000'})
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie'] and 'SameSite=lax' in response.headers['set-cookie']
    token = response.json()['access_token']
    assert client.get('/api/v1/auth/me').status_code == 200
    assert client.patch(f"/api/v1/shops/{store['shop']}", json={'name':'CSRF'}).status_code == 403
    assert client.post('/api/v1/auth/logout', headers={'Origin':'http://localhost:3000'}).status_code == 204
    assert client.get('/api/v1/auth/me').status_code == 401
    assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_auth_rate_limit(client):
    for _ in range(10):
        assert client.post('/api/v1/auth/login', json={'email':'nobody@example.com','password':'invalid'}, headers={'Origin':'http://localhost:3000'}).status_code == 401
    response = client.post('/api/v1/auth/login', json={'email':'nobody@example.com','password':'invalid'}, headers={'Origin':'http://localhost:3000'})
    assert response.status_code == 429 and response.headers['retry-after'] == '60'


@pytest.mark.skipif(engine.dialect.name != 'postgresql', reason='Requires real PostgreSQL row locks')
def test_concurrent_checkouts_and_retries(store):
    def submit(key):
        with TestClient(app) as client:
            return checkout(client, store, payload(store, items=[{'product_id':store['product'],'quantity':3}]), key)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, [uuid4().hex, uuid4().hex]))
    assert sorted(r.status_code for r in responses) == [201, 409]
    with TestingSessionLocal() as db:
        assert db.get(Product, store['product']).stock_quantity == 2
    with TestingSessionLocal() as db:
        product=db.get(Product, store['product']);product.stock_quantity=5;db.commit()
    key=uuid4().hex
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses=list(pool.map(submit,[key,key]))
    assert [r.status_code for r in responses] == [201,201]
    assert responses[0].json()['id'] == responses[1].json()['id']


def test_request_body_limit_and_headers(client):
    response = client.post('/api/v1/auth/login', content=b'x' * 1048577, headers={'Content-Type':'application/json'})
    assert response.status_code == 413
    response = client.get('/api/v1/themes')
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-request-id']


def test_runtime_does_not_create_schema_or_seed(monkeypatch):
    import importlib
    main = importlib.import_module('app.main')
    def forbidden(*args, **kwargs):
        raise AssertionError('Implicit provisioning must remain disabled')
    monkeypatch.setattr(main.Base.metadata, 'create_all', forbidden)
    monkeypatch.setattr(main, 'seed_all', forbidden)
    with TestClient(app) as client:
        assert client.get('/health').status_code == 200


def test_database_rejects_negative_stock(store):
    from sqlalchemy.exc import IntegrityError
    with TestingSessionLocal() as db:
        product = db.get(Product, store['product'])
        product.stock_quantity = -1
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()


def test_readiness_reports_database_failure(client, monkeypatch):
    import importlib
    main = importlib.import_module('app.main')
    def unavailable():
        raise RuntimeError('DB offline')
    monkeypatch.setattr(main.engine, 'connect', unavailable)
    assert client.get('/ready').status_code == 503


def test_reference_seed_is_repeatable_without_demo_accounts(store, monkeypatch):
    from app.seeds import seed_data
    monkeypatch.setattr(seed_data, 'SessionLocal', TestingSessionLocal)
    with TestingSessionLocal() as db:
        users = db.query(User).count()
        products = db.query(Product).count()
    seed_data.seed_all()
    seed_data.seed_all()
    with TestingSessionLocal() as db:
        assert db.query(User).count() == users
        assert db.query(Product).count() == products
        assert db.query(Plan).count() == 3
        assert db.get(Product, store['product']).stock_quantity == 5


@pytest.mark.parametrize('remaining', [1.01, 2.5])
def test_revocation_ttl_covers_entire_token_lifetime(monkeypatch, remaining):
    import redis
    from app.core import security
    monkeypatch.setattr(settings, 'REDIS_URL', 'redis://test')
    monkeypatch.setattr(security.time, 'time', lambda: 1000.0)
    expirations = []
    class FakeRedis:
        def setex(self, key, ttl, value):
            expirations.append(ttl)
    monkeypatch.setattr(redis.Redis, 'from_url', lambda *args, **kwargs: FakeRedis())
    security.session_revoked({'jti':'clock-test', 'exp':1000.0 + remaining}, revoke=True)
    assert expirations[0] >= remaining
