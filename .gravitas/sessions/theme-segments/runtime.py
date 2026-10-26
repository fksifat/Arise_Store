import json
from pathlib import Path
from urllib.request import urlopen

catalog=json.loads(Path('services/api/app/theme_catalog.json').read_text())
def get(path):
    with urlopen('http://localhost:3000'+path,timeout=15) as response:
        assert response.status==200, path
        return response.read()
themes=json.loads(get('/api/v1/themes'))
assert {theme['theme_key'] for theme in themes}=={preset['key'] for preset in catalog}
for theme in themes:
    assert get(theme['preview_image_url']).startswith(b'\xff\xd8'), theme['theme_key']
    get('/themes/'+theme['theme_key'])
plans=json.loads(get('/api/v1/plans'))
assert f'All {len(catalog)} configurable storefront themes' in next(plan for plan in plans if plan['slug']=='premium')['features']
with urlopen('http://localhost:8000/ready',timeout=10) as response:assert response.status==200
get('/health')
print(f'PASS: {len(themes)} seeded themes, preview pages, real JPEG thumbnails, updated plan metadata and healthy local runtime.')
