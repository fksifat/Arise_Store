import time
from http.cookies import SimpleCookie
from uuid import uuid4
import pytest
from app.config import settings
from app.core.security import decode_access_token, session_revoked
from tests.test_hardening import client, store, isolated_rate_limits
from tests.conftest import TestingSessionLocal
from app.models import User
from app.core.security import verify_password


@pytest.mark.parametrize('length,expected_status', [(7, 422), (8, 201), (128, 201), (129, 422)])
def test_registration_password_length_boundary_and_login(client, length, expected_status):
    email = f'password-{uuid4().hex}@example.com'
    password = 'a' * length
    headers = {'Origin': 'http://localhost:3000'}
    response = client.post('/api/v1/auth/register', headers=headers, json={'name': 'Password Owner', 'email': email, 'password': password})
    assert response.status_code == expected_status, response.text
    with TestingSessionLocal() as db:
        user = db.query(User).filter(User.email == email).first()
        if expected_status == 422:
            assert user is None
            assert 'set-cookie' not in response.headers
        else:
            assert user is not None and verify_password(password, user.password_hash)
    if expected_status == 201:
        assert client.post('/api/v1/auth/login', headers=headers, json={'email': email, 'password': password}).status_code == 200


@pytest.mark.parametrize('remember', [None, False, True])
def test_session_duration_matches_cookie_and_logout_revokes_token(client, store, remember):
    data = {'email': store['email'], 'password': 'a-secure-password'}
    if remember is not None:
        data['remember_me'] = remember
    response = client.post('/api/v1/auth/login', headers={'Origin': 'http://localhost:3000'}, json=data)
    assert response.status_code == 200
    duration = 7 * 86400 if remember else settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    cookie = SimpleCookie(response.headers['set-cookie'])['arise_session']
    assert int(cookie['max-age']) == duration
    assert cookie['httponly'] and cookie['samesite'] == 'lax' and cookie['path'] == '/'
    token = response.json()['access_token']
    payload = decode_access_token(token)
    assert payload is not None
    assert abs(payload['exp'] - payload['iat'] - duration) <= 1
    assert client.get('/api/v1/auth/me').status_code == 200
    assert client.post('/api/v1/auth/logout', headers={'Origin': 'http://localhost:3000'}).status_code == 204
    assert client.get('/api/v1/auth/me').status_code == 401
    assert client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_wrong_password_never_creates_remembered_session(client, store):
    result = client.post('/api/v1/auth/login', headers={'Origin': 'http://localhost:3000'}, json={'email': store['email'], 'password': 'incorrect-password', 'remember_me': True})
    assert result.status_code == 401
    assert 'set-cookie' not in result.headers


def test_redis_revocation_covers_full_remembered_session(monkeypatch):
    values = {}

    class RedisStub:
        def setex(self, key, ttl, value):
            values.update(key=key, ttl=ttl, value=value)
        def exists(self, key):
            return key == values.get('key')

    monkeypatch.setattr(settings, 'REDIS_URL', 'redis://test')
    monkeypatch.setattr('redis.Redis.from_url', lambda *args, **kwargs: RedisStub())
    payload = {'jti': 'remembered-session', 'exp': time.time() + 7 * 86400}
    assert session_revoked(payload, revoke=True)
    assert 7 * 86400 - 1 <= values['ttl'] <= 7 * 86400
    assert session_revoked(payload)
