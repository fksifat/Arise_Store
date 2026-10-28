from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from app.core.security import decode_access_token
from app.models import Shop, ShopMembership, ShopDomain, ShopThemeSetting, SitePage, Subscription
from tests.conftest import TestingSessionLocal
from tests.test_hardening import client, store, isolated_rate_limits


@pytest.mark.parametrize('status', ['draft', 'published', 'suspended', 'archived'])
def test_existing_owned_store_blocks_creation_and_preserves_data(client, store, status):
    with TestingSessionLocal() as db:
        db.get(Shop, store['shop']).status = status
        db.commit()
        before = {model: db.query(model).count() for model in (Shop, ShopMembership, ShopDomain, ShopThemeSetting, SitePage, Subscription)}
    headers = store['owner']
    draft = {'step': 4, 'website_type': 'business', 'name': 'Keep draft', 'slug': 'keep-' + uuid4().hex[:10], 'theme_key': 'business-studio'}
    assert client.put('/api/v1/setup', headers=headers, json=draft).status_code == 200
    response = client.post('/api/v1/shops', headers=headers, json={**draft, 'complete_setup': True})
    assert response.status_code == 409
    assert response.json()['detail']['code'] == 'store_limit_reached'
    assert client.get('/api/v1/setup', headers=headers).json() == draft
    with TestingSessionLocal() as db:
        assert {model: db.query(model).count() for model in before} == before


def test_member_access_does_not_consume_owned_slot_but_second_owned_store_is_locked(client, store):
    data = {'name': 'First owned store', 'slug': 'first-' + uuid4().hex[:12]}
    first = client.post('/api/v1/shops', headers=store['staff'], json=data)
    assert first.status_code == 201, first.text
    for kind in ['business', 'online_store']:
        second = client.post('/api/v1/shops', headers=store['staff'], json={**data, 'slug': 'second-' + uuid4().hex[:12], 'website_type': kind})
        assert second.status_code == 409
    assert len(client.get('/api/v1/shops', headers=store['staff']).json()) == 2
    assert client.get(f"/api/v1/shops/{store['shop']}", headers=store['staff']).status_code == 200


def test_simultaneous_first_store_requests_create_only_one(client, store):
    owner_id = decode_access_token(store['staff']['Authorization'][7:])['sub']
    def create(_):
        return client.post('/api/v1/shops', headers=store['staff'], json={'name': 'Concurrent store', 'slug': 'concurrent-' + uuid4().hex[:12]})
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(create, range(2)))
    assert sorted(response.status_code for response in responses) == [201, 409]
    with TestingSessionLocal() as db:
        assert db.query(Shop).filter(Shop.owner_user_id == owner_id).count() == 1


def test_existing_multi_store_account_keeps_access_but_cannot_create_more(client, store):
    owner_id = decode_access_token(store['owner']['Authorization'][7:])['sub']
    with TestingSessionLocal() as db:
        legacy = Shop(owner_user_id=owner_id, name='Legacy store', slug='legacy-' + uuid4().hex[:12])
        db.add(legacy)
        db.flush()
        db.add(ShopMembership(shop_id=legacy.id, user_id=owner_id, role='owner'))
        db.commit()
        legacy_id = legacy.id
    assert len(client.get('/api/v1/shops', headers=store['owner']).json()) == 2
    assert client.patch(f'/api/v1/shops/{legacy_id}', headers=store['owner'], json={'name': 'Legacy updated'}).status_code == 200
    assert client.post('/api/v1/shops', headers=store['owner'], json={'name': 'Extra store', 'slug': 'extra-' + uuid4().hex[:12]}).status_code == 409
