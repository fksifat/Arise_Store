import pytest

from tests.test_hardening import client, store, isolated_rate_limits
from tests.test_website_builder import new_site, homepage, content_path, page_data


def test_duplicate_content_urls_explain_how_to_recover_and_preserve_drafts(client, store):
    site = new_site(client, store)
    home = homepage(client, store, site)
    duplicate = client.post(content_path(site), headers=store['owner'], json=page_data('Home', 'home'))
    assert duplicate.status_code == 409
    assert 'Choose a different URL' in duplicate.json()['detail']
    first = client.post(content_path(site), headers=store['owner'], json=page_data()).json()
    second = client.post(content_path(site), headers=store['owner'], json=page_data('Contact', 'contact')).json()
    collision = client.put(content_path(site, second), headers=store['owner'], json=page_data('Changed', 'about') | {'expected_revision': second['revision']})
    assert collision.status_code == 409 and 'another page' in collision.json()['detail']
    saved = client.get(content_path(site, second), headers=store['owner']).json()
    assert (saved['title'], saved['slug'], saved['revision']) == ('Contact', 'contact', second['revision'])
    unchanged = client.put(content_path(site, first), headers=store['owner'], json=page_data() | {'expected_revision': first['revision']})
    assert unchanged.status_code == 200
    post = client.post(content_path(site), headers=store['owner'], json=page_data() | {'kind': 'post'})
    assert post.status_code == 201
    assert client.get(content_path(site, home), headers=store['owner']).json()['slug'] == 'home'


@pytest.mark.parametrize('url', ['/uploads/bottle.jpg', 'https://example.com/bottle.jpg'])
def test_product_image_paths_survive_creation_and_editing(client, store, url):
    base = f"/api/v1/shops/{store['shop']}/products"
    created = client.post(base, headers=store['owner'], json={'name': 'Bottle', 'price_minor': 45050, 'images': [{'image_url': url}]})
    assert created.status_code == 201, created.text
    assert created.json()['images'][0]['image_url'] == url
    edited = client.patch(base + '/' + created.json()['id'], headers=store['owner'], json={'name': 'Updated bottle', 'images': [{'image_url': url}]})
    assert edited.status_code == 200 and edited.json()['images'][0]['image_url'] == url


@pytest.mark.parametrize('url', ['javascript:alert(1)', '//evil.example/image.jpg', '/\\evil.example/image.jpg', 'https://user:secret@example.com/image.jpg', 'data:image/svg+xml,test', 'https://example.com/image\n.jpg', ''])
def test_unsafe_product_images_are_rejected_without_overwriting_saved_images(client, store, url):
    base = f"/api/v1/shops/{store['shop']}/products"
    images = [{'image_url': url}]
    assert client.post(base, headers=store['owner'], json={'name': 'Unsafe image', 'price_minor': 100, 'images': images}).status_code == 422
    path = base + '/' + store['product']
    before = client.get(path, headers=store['owner']).json()['images']
    assert client.patch(path, headers=store['owner'], json={'images': images}).status_code == 422
    assert client.get(path, headers=store['owner']).json()['images'] == before
