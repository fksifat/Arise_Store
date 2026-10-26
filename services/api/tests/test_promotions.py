import json
from uuid import uuid4
import pytest
from app.models import Product, ProductVariant, Order, Shop, ShopThemeSetting, User, ShopMembership
from app.core.security import create_access_token, hash_password
from tests.conftest import TestingSessionLocal
from tests.test_hardening import client, store, isolated_rate_limits, payload, checkout


def content(percent=15, enabled=True, **changes):
    value = {'banner_url':'https://example.com/banner.jpg', 'hero':{'title':'Our weekend collection','subtitle':'Selected for your everyday.','button_text':'Shop the offer','image_alt':'Our featured products'}, 'promotion':{'enabled':enabled,'message':'A little extra for your weekend','discount_percent':percent}}
    value.update(changes)
    return value


def configure(client, store, percent=15, enabled=True):
    settings = {'brand':{'primary_color':'#123456'},'hero':{'image_url':'/themes/assets/tech.jpg'},'merchant_extra':'preserve me'}
    response = client.put(f"/api/v1/shops/{store['shop']}/theme-settings",headers=store['owner'],json={'theme_key':'tech-cosmetics','settings_json':settings})
    assert response.status_code == 200, response.text
    response = client.put(f"/api/v1/shops/{store['shop']}/storefront-content",headers=store['owner'],json=content(percent,enabled))
    assert response.status_code == 200, response.text
    return response.json()


def test_content_update_preserves_brand_and_exposes_offer(client, store):
    saved = configure(client, store)
    assert saved['settings']['brand']['primary_color'] == '#123456'
    assert saved['settings']['hero']['image_url'] == '/themes/assets/tech.jpg'
    assert saved['settings']['merchant_extra'] == 'preserve me'
    public = client.get('/api/v1/public/store',headers={'X-Shop-Slug':store['slug']}).json()
    assert public['banner_url'] == content()['banner_url']
    assert public['discount_percent'] == 15
    assert public['theme']['settings']['hero']['title'] == 'Our weekend collection'
    assert public['theme']['settings']['promotion']['message'] == content()['promotion']['message']


@pytest.mark.parametrize('percent',[-1,101,1.5,'15',True])
def test_invalid_discount_cannot_partially_change_content_or_bypass_theme_api(client, store, percent):
    before = configure(client, store)
    invalid = content(percent,banner_url='https://example.com/changed.jpg')
    path = f"/api/v1/shops/{store['shop']}"
    assert client.put(path+'/storefront-content',headers=store['owner'],json=invalid).status_code == 422
    assert client.put(path+'/theme-settings',headers=store['owner'],json={'settings_json':{'promotion':invalid['promotion']}}).status_code == 422
    assert client.get(path,headers=store['owner']).json()['banner_url'] == before['banner_url']
    assert client.get(path+'/theme-settings',headers=store['owner']).json()['settings'] == before['settings']


@pytest.mark.parametrize('url',['javascript:alert(1)','data:image/svg+xml,invalid','https://user:password@example.com/image.jpg'])
def test_unsafe_banner_urls_rejected(client, store, url):
    configure(client, store)
    result = client.put(f"/api/v1/shops/{store['shop']}/storefront-content",headers=store['owner'],json=content(banner_url=url))
    assert result.status_code == 422


@pytest.mark.parametrize('variant_price',[None,12501])
def test_quote_checkout_and_tracking_use_saved_discount_on_current_prices(client, store, variant_price):
    configure(client, store)
    item = {'product_id':store['product'],'quantity':2}
    with TestingSessionLocal() as db:
        db.get(Product,store['product']).compare_at_price_minor = 20000
        if variant_price is not None:
            variant = ProductVariant(product_id=store['product'],title='Special option',price_minor=variant_price,stock_quantity=5)
            db.add(variant);db.flush();item['variant_id']=variant.id
        db.commit()
    subtotal = (variant_price or 10000)*2
    discount = (subtotal*15+50)//100
    quote = client.post('/api/v1/public/cart/validate',headers={'X-Shop-Slug':store['slug']},json={'items':[item],'shipping_city':'Dhaka'}).json()
    assert quote['subtotal_minor'] == subtotal
    assert quote['discount_minor'] == discount
    assert quote['delivery_fee_minor'] == 6000
    assert quote['total_minor'] == subtotal-discount+6000
    response = checkout(client,store,payload(store,items=[item],expected_total_minor=quote['total_minor'],discount_minor=subtotal))
    assert response.status_code == 201, response.text
    order=response.json()
    assert order['subtotal_minor'] == subtotal and order['discount_minor'] == discount
    assert order['total_minor'] == quote['total_minor']
    assert order['items'][0]['unit_price_minor'] == (variant_price or 10000)
    tracked = client.post('/api/v1/public/orders/track',headers={'X-Shop-Slug':store['slug']},json={'order_number':order['order_number'],'phone':'01712345678'}).json()
    assert tracked['discount_minor'] == discount and tracked['total_minor'] == order['total_minor']


@pytest.mark.parametrize('percent,price,discount',[(50,29,15),(100,29,29),(0,29,0)])
def test_discount_rounds_half_up_without_discounting_delivery(client, store, percent, price, discount):
    configure(client,store,percent)
    with TestingSessionLocal() as db:
        db.get(Product,store['product']).price_minor=price;db.commit()
    quote=client.post('/api/v1/public/cart/validate',headers={'X-Shop-Slug':store['slug']},json={'items':[{'product_id':store['product'],'quantity':1}],'shipping_city':'Outside Dhaka'}).json()
    assert quote['discount_minor'] == discount
    assert quote['delivery_fee_minor'] == 12000 and quote['total_minor'] == price-discount+12000


def test_changed_discount_rejects_stale_quote_and_replay_preserves_snapshot(client, store):
    configure(client,store,10)
    data=payload(store,items=[{'product_id':store['product'],'quantity':5}],expected_total_minor=51000)
    client.put(f"/api/v1/shops/{store['shop']}/storefront-content",headers=store['owner'],json=content(20))
    stale=checkout(client,store,data)
    assert stale.status_code == 409 and stale.json()['detail']['code'] == 'price_changed'
    with TestingSessionLocal() as db:
        assert db.get(Product,store['product']).stock_quantity == 5
        assert db.query(Order).filter(Order.shop_id==store['shop']).count() == 0
    data['expected_total_minor']=46000
    key=uuid4().hex
    first=checkout(client,store,data,key)
    assert first.status_code == 201 and first.json()['discount_minor'] == 10000
    client.put(f"/api/v1/shops/{store['shop']}/storefront-content",headers=store['owner'],json=content(20,False))
    replay=checkout(client,store,data,key)
    assert replay.status_code == 201 and replay.json() == first.json()
    public=client.get('/api/v1/public/store',headers={'X-Shop-Slug':store['slug']}).json()
    assert public['discount_percent'] == 0


def test_content_is_tenant_scoped_and_requires_authentication(client, store):
    configure(client,store)
    with TestingSessionLocal() as db:
        user=User(name='Other merchant',email=f'{uuid4().hex}@example.com',password_hash=hash_password('another-secure-password'),role='merchant')
        db.add(user);db.commit();token=create_access_token(user.id)
    path=f"/api/v1/shops/{store['shop']}/storefront-content"
    assert client.put(path,json=content()).status_code == 401
    assert client.put(path,headers={'Authorization':f'Bearer {token}'},json=content()).status_code == 403
    with TestingSessionLocal() as db:
        db.add(ShopMembership(shop_id=store['shop'],user_id=user.id,role='manager'));db.commit()
    assert client.put(path,headers={'Authorization':f'Bearer {token}'},json=content()).status_code == 403
    assert client.put(path,headers=store['staff'],json=content()).status_code == 403
