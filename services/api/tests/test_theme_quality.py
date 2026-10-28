import pytest
from app.schemas.page import PageSection
from app.core.websites import CATALOG
from tests.test_hardening import client, store, isolated_rate_limits
from tests.test_website_builder import new_site, homepage, content_path, page_data, publish, make_live


def test_section_design_controls_round_trip_without_changing_published_content(client, store):
    site = new_site(client, store)
    page = make_live(client, store, site)
    changes = {key: page[key] for key in ('title', 'slug', 'description', 'sections')}
    changes['sections'][0].update(anchor='new-intro', layout='image_left', spacing='compact', tone='accent')
    saved = client.put(content_path(site, page), headers=store['owner'], json=changes | {'expected_revision': page['revision']})
    assert saved.status_code == 200, saved.text
    section = saved.json()['sections'][0]
    assert (section['anchor'], section['layout'], section['spacing'], section['tone']) == ('new-intro', 'image_left', 'compact', 'accent')
    public = client.get('/api/v1/public/website/content/page/home', params={'shop':site['slug']}).json()['page']
    assert public['sections'][0]['anchor'] == ''
    publish(client, store, site, saved.json())
    public = client.get('/api/v1/public/website/content/page/home', params={'shop':site['slug']}).json()['page']
    assert public['sections'][0]['anchor'] == 'new-intro'


@pytest.mark.parametrize('fields', [{'layout':'arbitrary'}, {'spacing':'-10'}, {'tone':'url(evil)'}, {'anchor':'two words'}, {'anchor':'123'}, {'anchor':'website-main'}])
def test_invalid_section_design_is_rejected(client, store, fields):
    site = new_site(client, store)
    data = page_data()
    data['sections'][0].update(fields)
    assert client.post(content_path(site), headers=store['owner'], json=data).status_code == 422


def test_section_anchors_cannot_collide_with_other_ids(client, store):
    site = new_site(client, store)
    data = page_data()
    data['sections'].append({'id':'other', 'type':'text', 'anchor':'story'})
    assert client.post(content_path(site), headers=store['owner'], json=data).status_code == 422


def test_every_website_starter_has_valid_editable_content_and_local_imagery():
    for kind, sections in CATALOG['starters'].items():
        assert len(sections) == 4
        parsed = [PageSection.model_validate(item) for item in sections]
        assert parsed[0].image_url.startswith('/themes/assets/')
        assert parsed[0].image_alt and parsed[0].body
        assert parsed[-1].type == 'contact'


@pytest.mark.parametrize('kind', ['business', 'online_store'])
def test_brand_style_is_validated_and_preserves_other_theme_settings(client, store, kind):
    site = new_site(client, store, kind)
    path = f"/api/v1/shops/{site['id']}/theme-settings"
    setting = client.get(path, headers=store['owner']).json()
    content = setting['settings'] | {'brand': {'primary_color':'#245d50', 'font_family':'serif'}, 'merchant_extra':'keep this'}
    updated = client.put(path, headers=store['owner'], json={'settings_json':content})
    assert updated.status_code == 200 and updated.json()['settings'] == content
    for brand in [{'primary_color':'red'}, {'primary_color':'#123'}, {'font_family':'url(evil)'}, {'font_family':None}]:
        assert client.put(path, headers=store['owner'], json={'settings_json':{'brand':brand}}).status_code == 422
    assert client.get(path, headers=store['owner']).json()['settings'] == content


def test_store_story_footer_and_button_are_editable_with_safe_links(client, store):
    site = new_site(client, store, 'online_store')
    path = f"/api/v1/shops/{site['id']}/storefront-content"
    payload = {'banner_url':'/themes/assets/home.jpg', 'hero':{'title':'A considered edit.\nFor everyday life.', 'subtitle':'', 'button_url':'#store-info', 'story_title':'A personal point of view', 'footer_text':'Made for your everyday.'}, 'promotion':{'enabled':False}}
    response = client.put(path, headers=store['owner'], json=payload)
    assert response.status_code == 200, response.text
    assert response.json()['settings']['hero']['subtitle'] == ''
    assert response.json()['settings']['hero']['title'] == 'A considered edit.\nFor everyday life.'
    assert response.json()['settings']['hero']['button_url'] == '#store-info'
    assert response.json()['banner_url'] == '/themes/assets/home.jpg'
    for link in ['javascript:alert(1)', '//evil.example', '/\\evil.example']:
        payload['hero']['button_url'] = link
        assert client.put(path, headers=store['owner'], json=payload).status_code == 422
