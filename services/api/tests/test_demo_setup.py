import pytest
from app.config import settings
from app.models import User, Shop
from app.core.security import hash_password, verify_password
from app.seeds import seed_data
from tests.conftest import TestingSessionLocal


def test_admin_setup_keeps_twelve_character_minimum(monkeypatch):
    from app import manage
    monkeypatch.setattr('sys.argv', ['manage', 'create-admin', '--email', 'admin@example.com'])
    monkeypatch.setattr(manage.getpass, 'getpass', lambda prompt: 'eight123')
    def forbidden():
        raise AssertionError('Invalid admin password must not open a database session')
    monkeypatch.setattr(manage, 'SessionLocal', forbidden)
    with pytest.raises(SystemExit) as error:
        manage.main()
    assert error.value.code == 2


def test_demo_seed_rejects_production_before_writes(monkeypatch):
    monkeypatch.setattr(settings, 'APP_ENV', 'production')
    def forbidden():
        raise AssertionError('Production demo setup must not open a database session')
    monkeypatch.setattr(seed_data, 'SessionLocal', forbidden)
    with pytest.raises(ValueError, match='forbidden in production'):
        seed_data.seed_all(demo=True)


def test_demo_setup_creates_both_roles_and_preserves_existing_passwords(monkeypatch):
    monkeypatch.setattr(settings, 'APP_ENV', 'development')
    monkeypatch.setattr(seed_data, 'SessionLocal', TestingSessionLocal)
    seed_data.seed_all(demo=True)
    with TestingSessionLocal() as db:
        admin = db.query(User).filter(User.email == 'admin@arisestore.com').one()
        merchant = db.query(User).filter(User.email == 'merchant@arisestore.com').one()
        assert admin.role == 'platform_admin' and verify_password('adminpassword123', admin.password_hash)
        assert merchant.role == 'merchant' and verify_password('merchantpassword123', merchant.password_hash)
        assert db.query(Shop).filter(Shop.owner_user_id == merchant.id).count() == 2
        admin.password_hash = hash_password('changed-demo-password-123')
        db.commit()
        user_count = db.query(User).count()
        shop_count = db.query(Shop).count()
    seed_data.seed_all(demo=True)
    with TestingSessionLocal() as db:
        assert db.query(User).count() == user_count
        assert db.query(Shop).count() == shop_count
        admin = db.query(User).filter(User.email == 'admin@arisestore.com').one()
        assert verify_password('changed-demo-password-123', admin.password_hash)
        assert not verify_password('adminpassword123', admin.password_hash)
