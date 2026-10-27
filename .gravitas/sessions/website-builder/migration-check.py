import os
import subprocess
import tempfile
from datetime import datetime
from pathlib import Path
from sqlalchemy import create_engine,MetaData,text

def run(env,action):
    result=subprocess.run(['venv/bin/alembic','-c','services/api/alembic.ini',*action],env=env,capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
    if result.stdout.strip():print(result.stdout.strip())

with tempfile.TemporaryDirectory(prefix='arise-builder-migration-') as directory:
    env={**os.environ,'DATABASE_URL':'sqlite:///'+str(Path(directory)/'migration.db'),'APP_ENV':'test','SEED_DEMO_DATA':'false','AUTO_CREATE_TABLES':'false'}
    run(env,['upgrade','0003'])
    engine=create_engine(env['DATABASE_URL']);metadata=MetaData();metadata.reflect(engine)
    now=datetime(2026,10,26,0,0)
    rows={
      'users':dict(id='legacy-owner',name='Legacy owner',email='legacy@example.com',password_hash='unused-test-hash',role='merchant',is_active=True,created_at=now,updated_at=now),
      'shops':dict(id='legacy-shop',owner_user_id='legacy-owner',name='Legacy store',slug='legacy-store',status='published',default_currency='BDT',default_locale='bn_BD',inside_dhaka_delivery_fee_minor='6000',outside_dhaka_delivery_fee_minor='12000',created_at=now,updated_at=now),
      'themes':dict(id='legacy-theme',theme_key='fashion-modern',name='Legacy fashion',version='1.0.0',configuration_schema='{}',is_active=True,created_at=now),
      'products':dict(id='legacy-product',shop_id='legacy-shop',name='Original product',slug='original-product',status='active',price_minor=2900,currency='BDT',stock_quantity=5,track_inventory=True,is_featured=False,created_at=now,updated_at=now),
      'orders':dict(id='legacy-order',shop_id='legacy-shop',order_number='ORD-LEGACY',status='pending',payment_method='cod',payment_status='unpaid',subtotal_minor=2900,delivery_fee_minor=6000,discount_minor=0,total_minor=8900,currency='BDT',customer_name='Original buyer',customer_phone='01712345678',shipping_city='Dhaka',shipping_address='Original address',created_at=now,updated_at=now),
    }
    with engine.begin() as connection:
        for table,values in rows.items():connection.execute(metadata.tables[table].insert().values(**values))
    run(env,['upgrade','head'])
    with engine.connect() as connection:
        for table,values in rows.items():
            stored=dict(connection.execute(metadata.tables[table].select()).mappings().one())
            assert all(stored[key]==value for key,value in values.items()),table
        assert connection.scalar(text('SELECT website_type FROM shops'))=='online_store'
        assert connection.scalar(text('SELECT website_type FROM themes'))=='online_store'
        assert connection.scalar(text('SELECT count(*) FROM site_pages'))==0
        assert connection.scalar(text('SELECT version_num FROM alembic_version'))=='0004'
    run(env,['check'])
    engine.dispose()
print('PASS: additive 0003-to-0004 migration preserves existing users, stores, products and order totals; existing types backfill as online_store; schema matches models.')
