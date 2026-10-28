from uuid import uuid4
from tests.test_hardening import client, store, isolated_rate_limits


def progress(**changes):
    return {'step': 2, 'website_type': 'business', 'name': 'My business', 'slug': 'my-business', 'theme_key': 'business-studio', **changes}


def test_setup_requires_authentication(client):
    assert client.get('/api/v1/setup').status_code == 401
    assert client.put('/api/v1/setup', json=progress()).status_code == 401


def test_progress_is_persistent_and_account_scoped(client, store):
    owner, staff = store['owner'], store['staff']
    assert client.get('/api/v1/setup', headers=owner).json() is None
    saved = progress(name='বাংলা প্রতিষ্ঠান', slug='partial-', step=3)
    assert client.put('/api/v1/setup', headers=owner, json=saved).json() == saved
    assert client.get('/api/v1/setup', headers=staff).json() is None
    other = progress(name='Another account')
    assert client.put('/api/v1/setup', headers=staff, json=other).status_code == 200
    assert client.get('/api/v1/setup', headers=owner).json() == saved
    saved['step'] = 2
    assert client.put('/api/v1/setup', headers=owner, json=saved).status_code == 200
    assert client.get('/api/v1/setup', headers=staff).json() == other


def test_invalid_draft_does_not_replace_saved_progress(client, store):
    headers = store['owner']
    assert client.put('/api/v1/setup', headers=headers, json=progress()).status_code == 200
    for bad in [progress(step=5), progress(name='x' * 101), progress(password='must-not-be-stored'), progress(website_type='online_store')]:
        assert client.put('/api/v1/setup', headers=headers, json=bad).status_code in (400, 422)
    assert client.get('/api/v1/setup', headers=headers).json() == progress()


def test_only_successful_setup_creation_clears_owners_draft(client, store):
    owner = store['owner']
    data = progress(step=4, slug=store['slug'])
    assert client.put('/api/v1/setup', headers=owner, json=data).status_code == 200
    assert client.put('/api/v1/setup', headers=store['staff'], json=progress()).status_code == 200
    failed = client.post('/api/v1/shops', headers=owner, json={**data, 'complete_setup': True})
    assert failed.status_code == 400
    assert client.get('/api/v1/setup', headers=owner).json() == data
    data['slug'] = 'setup-' + uuid4().hex[:16]
    created = client.post('/api/v1/shops', headers=owner, json={**data, 'complete_setup': True})
    assert created.status_code == 201, created.text
    assert created.json()['status'] == 'draft'
    assert client.get('/api/v1/setup', headers=owner).json() is None
    assert client.get('/api/v1/setup', headers=store['staff']).json() == progress()
    pages = client.get(f"/api/v1/shops/{created.json()['id']}/pages", headers=owner).json()
    assert pages['total'] == 1


def test_other_website_creation_keeps_unfinished_setup(client, store):
    headers = store['owner']
    assert client.put('/api/v1/setup', headers=headers, json=progress()).status_code == 200
    result = client.post('/api/v1/shops', headers=headers, json={'name': 'Separate site', 'slug': 'separate-' + uuid4().hex[:16]})
    assert result.status_code == 201
    assert client.get('/api/v1/setup', headers=headers).json() == progress()
