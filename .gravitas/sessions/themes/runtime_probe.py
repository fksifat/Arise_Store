import json
from urllib.request import urlopen


def get(path):
    with urlopen(f'http://localhost:3000{path}', timeout=10) as response:
        assert response.status == 200
        return response.read()


themes = json.loads(get('/api/v1/themes'))
assert len(themes) == 6
for theme in themes:
    get(f"/themes/{theme['theme_key']}")
    assert get(theme['preview_image_url']).startswith(b'\xff\xd8')
plans = json.loads(get('/api/v1/plans'))
premium = next(plan for plan in plans if plan['slug'] == 'premium')
assert 'All 6 configurable storefront themes' in premium['features']
get('/')
with urlopen('http://localhost:8000/ready', timeout=10) as response:
    assert response.status == 200
print('PASS: six preview pages/images, current plan metadata, homepage and API readiness.')
