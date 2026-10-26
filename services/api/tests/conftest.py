import pytest
import tempfile
import os
from pathlib import Path

# Local demo settings must never provision accounts during a test app's startup.
os.environ["APP_ENV"] = "test"
os.environ["SEED_DEMO_DATA"] = "false"
os.environ["AUTO_CREATE_TABLES"] = "false"

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

_temp = tempfile.TemporaryDirectory(prefix="arise-tests-")
TEST_DB_URL = os.environ.get("TEST_DATABASE_URL", f"sqlite:///{_temp.name}/test.db")
if not TEST_DB_URL.startswith("sqlite:") and not TEST_DB_URL.rsplit("/", 1)[-1].endswith("_test"):
    raise RuntimeError("TEST_DATABASE_URL must point to a dedicated database ending in _test")
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False} if TEST_DB_URL.startswith("sqlite:") else {})
if engine.dialect.name == "sqlite":
    @event.listens_for(engine, "connect")
    def enable_test_constraints(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    from app.seeds import seed_data
    original = seed_data.SessionLocal
    seed_data.SessionLocal = TestingSessionLocal
    try:
        seed_data.seed_all()
    finally:
        seed_data.SessionLocal = original
    yield
    Base.metadata.drop_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def subscriptions_for_legacy_fixtures(request):
    if request.module.__name__.endswith(("test_tenant_isolation", "test_public_checkout")):
        from app.models.shop import Shop
        from app.models.subscription import Subscription, Plan
        from datetime import datetime, timedelta, timezone
        with TestingSessionLocal() as db:
            plan = db.query(Plan).filter(Plan.slug == "starter").one()
            for shop in db.query(Shop).all():
                if not db.query(Subscription).filter(Subscription.shop_id == shop.id).first():
                    db.add(Subscription(shop_id=shop.id, plan_id=plan.id, status="trial", current_period_end=datetime.now(timezone.utc)+timedelta(days=14)))
            db.commit()

