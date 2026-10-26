from datetime import datetime, timedelta
from uuid import uuid4
import pytest
from app.models import Customer, Order, OrderItem, Product, User, Shop
from app.core.security import create_access_token, hash_password
from tests.conftest import TestingSessionLocal
from tests.test_hardening import client, store, isolated_rate_limits


def add_order(db, store, status='delivered', stamp=None, customer=None):
    order=Order(shop_id=store['shop'],customer_id=customer.id if customer else None,order_number=f'ORD-{uuid4().hex}',status=status,payment_method='cod',payment_status='paid' if status=='delivered' else 'unpaid',subtotal_minor=10000,discount_minor=1000,delivery_fee_minor=6000,total_minor=15000,customer_name='Historical Buyer',customer_phone=customer.phone if customer else '01712345678',shipping_city='Dhaka',shipping_address='Saved delivery address',created_at=stamp or datetime(2026,10,25,8))
    db.add(order);db.flush()
    db.add(OrderItem(order_id=order.id,product_id=store['product'],product_name_snapshot='Historical Shirt',unit_price_minor=10000,quantity=1,line_total_minor=10000))
    return order


def test_reports_use_dhaka_boundaries_and_current_delivered_snapshots(client,store):
    with TestingSessionLocal() as db:
        for stamp in [datetime(2026,10,24,17,59,59),datetime(2026,10,24,18),datetime(2026,10,25,17,59,59),datetime(2026,10,25,18)]:
            add_order(db,store,stamp=stamp)
        for status in ['pending','cancelled','returned','refunded']:
            add_order(db,store,status=status)
        db.get(Product,store['product']).name='Renamed catalog item';db.commit()
    response=client.get(f"/api/v1/shops/{store['shop']}/reports?start_date=2026-10-25&end_date=2026-10-25",headers=store['owner'])
    assert response.status_code==200,response.text
    report=response.json()
    assert report['timezone']=='Asia/Dhaka'
    assert report['metrics']=={'total_orders':6,'awaiting_fulfillment':1,'delivered_orders':2,'delivered_value_minor':30000,'delivered_products_minor':18000,'delivered_delivery_minor':12000,'delivered_discounts_minor':2000,'average_delivered_minor':15000,'customer_count':1}
    assert report['daily']==[{'date':'2026-10-25','orders':6,'delivered_value_minor':30000}]
    assert report['top_products']==[{'name':'Historical Shirt','units':2,'item_value_minor':20000}]
    assert report['statuses']['returned']==1 and report['statuses']['refunded']==1


@pytest.mark.parametrize('query',[
 'start_date=2026-10-26&end_date=2026-10-25',
 'start_date=2020-01-01&end_date=2026-10-25',
 'start_date=invalid',
 'end_date=0001-01-01',
 'start_date=9999-12-31&end_date=9999-12-31',
])
def test_invalid_report_ranges_are_rejected(client,store,query):
    response=client.get(f"/api/v1/shops/{store['shop']}/reports?{query}",headers=store['owner'])
    assert response.status_code==422


def test_empty_report_fills_days_without_inventing_sales(client,store):
    response=client.get(f"/api/v1/shops/{store['shop']}/reports?start_date=2026-10-20&end_date=2026-10-22",headers=store['owner'])
    assert response.status_code==200
    report=response.json()
    assert len(report['daily'])==3
    assert all(value==0 for value in report['metrics'].values())
    assert report['top_products']==[]


def test_customer_search_pagination_and_history_are_shop_scoped(client,store):
    with TestingSessionLocal() as db:
        buyers=[]
        for index in range(26):
            buyer=Customer(shop_id=store['shop'],name=f'Buyer {index:02}',phone=f'017{index:08}',email=f'buyer{index}@example.com',created_at=datetime(2026,10,1)+timedelta(minutes=index))
            db.add(buyer);buyers.append(buyer)
        db.flush();buyer_id=buyers[0].id
        for status in ['pending','delivered','cancelled','returned','refunded']:
            add_order(db,store,status=status,customer=buyers[0])
        db.commit()
    path=f"/api/v1/shops/{store['shop']}/customers"
    first=client.get(path,headers=store['owner']).json()
    assert first['total']==26 and len(first['items'])==25
    second=client.get(path+'?page=2',headers=store['owner']).json()
    assert len(second['items'])==1 and second['items'][0]['id']==buyer_id
    found=client.get(path+'?search=BUYER0@EXAMPLE.COM',headers=store['owner']).json()
    assert found['total']==1
    buyer=found['items'][0]
    assert buyer['total_orders']==5 and buyer['delivered_orders']==1
    assert buyer['cancelled_orders']==1 and buyer['returned_orders']==2
    assert buyer['delivered_value_minor']==15000
    history=client.get(path+'/'+buyer_id,headers=store['owner']).json()
    assert len(history['orders'])==5 and history['has_more_orders'] is False
    assert client.get(path+'?page=0',headers=store['owner']).status_code==422
    assert client.get(path+'?page_size=1000',headers=store['owner']).status_code==422


def test_customer_history_is_bounded_and_does_not_change_inventory(client,store):
    with TestingSessionLocal() as db:
        buyer=Customer(shop_id=store['shop'],name='Repeat customer',phone='01712345678')
        db.add(buyer);db.flush();buyer_id=buyer.id
        for index in range(51):add_order(db,store,customer=buyer,stamp=datetime(2026,10,25,8)+timedelta(minutes=index))
        db.commit()
    history=client.get(f"/api/v1/shops/{store['shop']}/customers/{buyer_id}",headers=store['owner']).json()
    assert history['total_orders']==51 and len(history['orders'])==50 and history['has_more_orders'] is True
    with TestingSessionLocal() as db:assert db.get(Product,store['product']).stock_quantity==5


def test_private_operations_reject_other_merchants_and_foreign_customers(client,store):
    with TestingSessionLocal() as db:
        other=User(name='Other merchant',email=f'{uuid4().hex}@example.com',password_hash=hash_password('another-secure-password'),role='merchant')
        db.add(other);db.flush();token=create_access_token(other.id)
        buyer=Customer(shop_id=store['shop'],name='Private buyer',phone='01712345678')
        db.add(buyer);db.flush();buyer_id=buyer.id
        foreign_shop=Shop(owner_user_id=other.id,name='Foreign store',slug=f'foreign-{uuid4().hex}',status='draft')
        db.add(foreign_shop);db.flush()
        foreign_buyer=Customer(shop_id=foreign_shop.id,name='Foreign customer',phone='01812345678')
        db.add(foreign_buyer);db.commit();foreign_id=foreign_buyer.id
    assert client.get(f"/api/v1/shops/{store['shop']}/customers/{foreign_id}",headers=store['owner']).status_code==404
    for endpoint in ['/reports','/customers','/customers/'+buyer_id]:
        path=f"/api/v1/shops/{store['shop']}"+endpoint
        assert client.get(path).status_code==401
        assert client.get(path,headers={'Authorization':f'Bearer {token}'}).status_code==403
    assert client.get(f"/api/v1/shops/{store['shop']}/customers/missing",headers=store['owner']).status_code==404
    assert client.get(f"/api/v1/shops/{store['shop']}/reports",headers=store['staff']).status_code==200
