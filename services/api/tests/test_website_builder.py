import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from app.models import Shop, SitePage, ShopMembership, Subscription, Theme
from app.core.websites import CATALOG
from tests.conftest import TestingSessionLocal
from tests.test_hardening import client, store, isolated_rate_limits


def new_site(client, store, kind='business'):
    result = client.post('/api/v1/shops', headers=store['owner'], json={'name':'New website','slug':'web-'+uuid4().hex,'website_type':kind})
    assert result.status_code == 201, result.text
    return result.json()


def content_path(site, page=None):
    return f"/api/v1/shops/{site['id']}/pages" + ('/'+page['id'] if page else '')


def homepage(client, store, site):
    result = client.get(content_path(site), headers=store['owner']).json()
    assert result['total'] == 1
    return client.get(content_path(site,result['items'][0]), headers=store['owner']).json()


def publish(client, store, site, page):
    response=client.post(content_path(site,page)+'/publish',headers=store['owner'],json={'expected_revision':page['revision']})
    assert response.status_code==200,response.text
    return response.json()


def make_live(client, store, site):
    page=publish(client,store,site,homepage(client,store,site))
    result=client.post(f"/api/v1/shops/{site['id']}/publish",headers=store['owner'])
    assert result.status_code==200,result.text
    return page


def page_data(title='About us',slug='about'):
    return {'title':title,'slug':slug,'description':'Public introduction','sections':[{'id':'story','type':'text','heading':'Our story','body':'Hello, visitors.'}]}


@pytest.mark.parametrize('kind',[item['key'] for item in CATALOG['types']])
def test_each_website_type_has_compatible_themes_and_creation(client,store,kind):
    site=new_site(client,store,kind)
    assert site['website_type']==kind and site['status']=='draft'
    library=client.get('/api/v1/themes',params={'website_type':kind}).json()
    assert len(library)>=(18 if kind=='online_store' else 3)
    assert all(theme['website_type']==kind for theme in library)
    setting=client.get(f"/api/v1/shops/{site['id']}/theme-settings",headers=store['owner']).json()
    assert setting['theme_key'] in [theme['theme_key'] for theme in library]
    if kind=='online_store':
        assert client.get(content_path(site),headers=store['owner']).json()['total']==0
    else:
        page=homepage(client,store,site)
        assert page['slug']=='home' and page['published_slug'] is None
        assert client.post(f"/api/v1/shops/{site['id']}/publish",headers=store['owner']).status_code==409
        make_live(client,store,site)
        public=client.get('/api/v1/public/website/content/page/home',params={'shop':site['slug']})
        assert public.status_code==200 and public.json()['page']['sections']
        assert client.get('/api/v1/public/products',headers={'X-Shop-Slug':site['slug']}).status_code==404
        assert client.get(f"/api/v1/shops/{site['id']}/products",headers=store['owner']).status_code==404


def test_drafts_and_url_changes_are_isolated_from_public_snapshots(client,store):
    site=new_site(client,store);page=make_live(client,store,site)
    about=client.post(content_path(site),headers=store['owner'],json=page_data()).json()
    assert client.get('/api/v1/public/website/content/page/about',params={'shop':site['slug']}).status_code==404
    about=publish(client,store,site,about)
    data=page_data('A private draft title','team');data['expected_revision']=about['revision']
    saved=client.put(content_path(site,about),headers=store['owner'],json=data)
    assert saved.status_code==200 and saved.json()['has_unpublished_changes']
    old=client.get('/api/v1/public/website/content/page/about',params={'shop':site['slug']}).json()
    assert old['page']['title']=='About us' and 'A private draft title' not in json.dumps(old)
    assert client.get('/api/v1/public/website/content/page/team',params={'shop':site['slug']}).status_code==404
    other=client.post(content_path(site),headers=store['owner'],json=page_data('Second about','about')).json()
    conflict=client.post(content_path(site,other)+'/publish',headers=store['owner'],json={'expected_revision':other['revision']})
    assert conflict.status_code==409
    about=publish(client,store,site,saved.json())
    assert client.get('/api/v1/public/website/content/page/about',params={'shop':site['slug']}).status_code==404
    assert client.get('/api/v1/public/website/content/page/team',params={'shop':site['slug']}).json()['page']['title']=='A private draft title'
    assert client.put(content_path(site,about),headers=store['owner'],json=data).status_code==409
    assert client.delete(content_path(site,about),headers=store['owner'],params={'expected_revision':about['revision']}).status_code==409
    unpublished=client.post(content_path(site,about)+'/unpublish',headers=store['owner'],json={'expected_revision':about['revision']}).json()
    assert client.get('/api/v1/public/website/content/page/team',params={'shop':site['slug']}).status_code==404
    assert client.delete(content_path(site,about),headers=store['owner'],params={'expected_revision':unpublished['revision']}).status_code==204
    assert client.post(content_path(site,page)+'/unpublish',headers=store['owner'],json={'expected_revision':page['revision']}).status_code==409


def test_pages_are_tenant_scoped_and_role_guarded(client,store):
    site=new_site(client,store);page=homepage(client,store,site)
    assert client.get(content_path(site,page)).status_code==401
    assert client.get(content_path(site,page),headers=store['staff']).status_code==403
    wrong={'id':store['shop']}
    assert client.get(content_path(wrong,page),headers=store['owner']).status_code==404
    with TestingSessionLocal() as db:
        source=db.query(ShopMembership).filter(ShopMembership.shop_id==store['shop'],ShopMembership.role=='staff').one()
        membership=ShopMembership(shop_id=site['id'],user_id=source.user_id,role='staff')
        db.add(membership);db.commit();member_id=membership.id
    assert client.get(content_path(site,page),headers=store['staff']).status_code==200
    changes=page_data('Edit','home')|{'expected_revision':page['revision']}
    assert client.put(content_path(site,page),headers=store['staff'],json=changes).status_code==403
    with TestingSessionLocal() as db:
        db.get(ShopMembership,member_id).role='manager';db.commit()
    assert client.put(content_path(site,page),headers=store['staff'],json=changes).status_code==200
    assert client.post(content_path(site,page)+'/publish',headers=store['staff'],json={'expected_revision':page['revision']+1}).status_code==403


@pytest.mark.parametrize('url',['javascript:alert(1)','//evil.example/path','/\\evil.example','https://user:secret@evil.example','data:text/html,test','https://safe.example\n.evil.example'])
def test_unsafe_links_and_images_are_rejected(client,store,url):
    site=new_site(client,store)
    for field in ['image_url','button_url']:
        data=page_data();data['sections'][0][field]=url
        assert client.post(content_path(site),headers=store['owner'],json=data).status_code==422
    assert client.get(content_path(site),headers=store['owner']).json()['total']==1


def test_section_limits_ids_and_theme_compatibility(client,store):
    site=new_site(client,store)
    data=page_data();data['sections']*=2
    assert client.post(content_path(site),headers=store['owner'],json=data).status_code==422
    data=page_data();data['sections']=[{'id':f'section-{i}','type':'text'} for i in range(31)]
    assert client.post(content_path(site),headers=store['owner'],json=data).status_code==422
    assert client.post('/api/v1/shops',headers=store['owner'],json={'name':'Bad type','slug':'bad-'+uuid4().hex,'website_type':'anything'}).status_code==422
    assert client.put(f"/api/v1/shops/{site['id']}/theme-settings",headers=store['owner'],json={'theme_key':'fashion-modern','settings_json':{}}).status_code==400
    assert client.post('/api/v1/shops',headers=store['owner'],json={'name':'Bad theme','slug':'bad-'+uuid4().hex,'website_type':'business','theme_key':'fashion-modern'}).status_code==400


def test_blog_feed_contains_only_published_posts_and_respects_access(client,store):
    site=new_site(client,store,'blog');make_live(client,store,site)
    draft=client.post(content_path(site),headers=store['owner'],json=page_data('Private draft','draft')|{'kind':'post'}).json()
    post=client.post(content_path(site),headers=store['owner'],json=page_data('First article','first-article')|{'kind':'post'}).json()
    publish(client,store,site,post)
    feed=client.get('/api/v1/public/website/posts',params={'shop':site['slug']}).json()
    assert feed['total']==1 and feed['items'][0]['title']=='First article'
    assert 'Private draft' not in json.dumps(feed)
    assert client.get('/api/v1/public/website/content/post/draft',params={'shop':site['slug']}).status_code==404
    with TestingSessionLocal() as db:
        sub=db.query(Subscription).filter(Subscription.shop_id==site['id']).one()
        sub.current_period_end=datetime.now(timezone.utc)-timedelta(days=1);db.commit()
    assert client.get('/api/v1/public/website/posts',params={'shop':site['slug']}).status_code==403
    assert client.post(content_path(site, draft)+'/publish',headers=store['owner'],json={'expected_revision':draft['revision']}).status_code==403


def test_hidden_sections_are_not_returned_in_public_content(client,store):
    site=new_site(client,store);make_live(client,store,site)
    data=page_data()
    data['sections'].append({'id':'private-plans','type':'text','heading':'PRIVATE HIDDEN CONTENT','body':'Hidden plans','enabled':False})
    draft=client.post(content_path(site),headers=store['owner'],json=data).json()
    publish(client,store,site,draft)
    response=client.get('/api/v1/public/website/content/page/about',params={'shop':site['slug']})
    assert response.status_code==200 and 'PRIVATE HIDDEN CONTENT' not in response.text
    assert len(response.json()['page']['sections'])==1
    assert 'PRIVATE HIDDEN CONTENT' in client.get(content_path(site,draft),headers=store['owner']).text


def test_private_preview_and_publication_guards_preserve_drafts_and_audit_actor(client,store):
    from app.models import AuditLog
    site=new_site(client,store);page=homepage(client,store,site)
    assert client.get(content_path(site)+'/preview-site').status_code==401
    assert client.get(content_path(site)+'/preview-site',headers=store['staff']).status_code==403
    assert client.get(content_path(site)+'/preview-site',headers=store['owner']).status_code==200
    data=page_data('Hidden content','home')|{'expected_revision':page['revision']}
    data['sections'][0]['enabled']=False
    saved=client.put(content_path(site,page),headers=store['owner'],json=data)
    assert saved.status_code==200
    assert client.post(content_path(site,page)+'/publish',headers=store['owner'],json={'expected_revision':saved.json()['revision']}).status_code==400
    with TestingSessionLocal() as db:
        log=db.query(AuditLog).filter(AuditLog.shop_id==site['id'],AuditLog.action=='website.draft_saved').one()
        assert log.actor_user_id==db.get(Shop,site['id']).owner_user_id
    assert client.delete(content_path(site,page),headers=store['owner'],params={'expected_revision':saved.json()['revision']}).status_code==400


def test_content_budget_and_empty_publication_remain_bounded(client,store):
    site=new_site(client,store)
    with TestingSessionLocal() as db:
        db.add_all(SitePage(shop_id=site['id'],kind='post',title=f'Draft {index}',slug=f'draft-{index}',sections_json='[]') for index in range(499))
        db.commit()
    result=client.post(content_path(site),headers=store['owner'],json=page_data())
    assert result.status_code==403 and '500' in result.text
    assert client.get(content_path(site),headers=store['owner'],params={'page_size':51}).status_code==422
