import json
from collections import Counter
from pathlib import Path
from app.models import Theme, ShopThemeSetting, Product, Order, Shop
from app.seeds import seed_data
from tests.conftest import TestingSessionLocal
from tests.test_hardening import client, store, isolated_rate_limits

CATALOG = json.loads((Path(__file__).resolve().parents[1] / 'app/theme_catalog.json').read_text())


def test_all_catalog_themes_are_registered(client):
    response = client.get('/api/v1/themes')
    assert response.status_code == 200
    themes = {theme['theme_key']: theme for theme in response.json()}
    assert {preset['key'] for preset in CATALOG} <= set(themes)
    for preset in CATALOG:
        theme = themes[preset['key']]
        assert theme['name'] == preset['name']
        assert theme['version'] == preset['version']
        assert theme['preview_image_url'] == preset['preview_image_url']
        assert json.loads(theme['configuration_schema'])['hero']['image_url'] == preset['image']


def test_each_segment_has_three_distinct_designs_and_a_compatible_family():
    assert len(CATALOG) == 18
    assert len({preset['key'] for preset in CATALOG}) == len(CATALOG)
    categories = Counter(preset['category'] for preset in CATALOG)
    assert len(categories) == 6 and set(categories.values()) == {3}
    by_key = {preset['key']: preset for preset in CATALOG}
    for category in categories:
        segment = [preset for preset in CATALOG if preset['category'] == category]
        assert len({preset['name'] for preset in segment}) == 3
        assert len({preset['title'] for preset in segment}) == 3
        assert len({preset['preview_image_url'] for preset in segment}) == 3
        for preset in segment:
            assert by_key[preset['family']]['category'] == category
            assert by_key[preset['family']]['family'] == preset['family']


def test_theme_refresh_preserves_merchant_customizations_and_catalog(store, monkeypatch):
    custom = {'brand': {'primary_color':'#124578'}, 'hero': {'title':'A merchant-authored headline'}}
    with TestingSessionLocal() as db:
        theme = db.query(Theme).filter(Theme.theme_key == 'fashion-modern').one()
        db.add(ShopThemeSetting(shop_id=store['shop'],theme_id=theme.id,settings_json=json.dumps(custom)))
        theme.name = 'Old theme name'
        db.commit()
        counts = (db.query(Product).count(), db.query(Order).count())
    monkeypatch.setattr(seed_data, 'SessionLocal', TestingSessionLocal)
    seed_data.seed_all()
    with TestingSessionLocal() as db:
        setting = db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id == store['shop']).one()
        assert json.loads(setting.settings_json) == custom
        assert setting.theme.name == 'Fashion Editorial'
        assert counts == (db.query(Product).count(), db.query(Order).count())
        assert db.get(Product, store['product']).stock_quantity == 5


def test_switching_every_theme_preserves_draft_shop_and_products(client, store):
    with TestingSessionLocal() as db:
        db.get(Shop, store['shop']).status='draft'; db.commit()
    for preset in CATALOG:
        settings={'brand':{'primary_color':'#124578'},'hero':{'title':'Our own story'}}
        response=client.put(f"/api/v1/shops/{store['shop']}/theme-settings",headers=store['owner'],json={'theme_key':preset['key'],'settings_json':settings})
        assert response.status_code == 200, response.text
        assert response.json()['theme_key'] == preset['key']
        assert response.json()['settings'] == settings
    with TestingSessionLocal() as db:
        assert db.get(Shop,store['shop']).status == 'draft'
        assert db.get(Product,store['product']).stock_quantity == 5
        assert db.query(ShopThemeSetting).filter(ShopThemeSetting.shop_id==store['shop']).count() == 1
