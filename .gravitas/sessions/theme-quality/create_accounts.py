"""Create only the local accounts requested for this theme review; keep credentials private."""
import json
import secrets
import sys
import time
from pathlib import Path
import httpx

ROOT = Path(__file__).resolve().parents[3]
PRIVATE = ROOT / '.data/theme-review/accounts.json'
web_catalog = json.loads((ROOT / 'services/api/app/website_catalog.json').read_text())
store_catalog = json.loads((ROOT / 'services/api/app/theme_catalog.json').read_text())
themes = web_catalog['themes'] + [dict(item, website_type='online_store') for item in store_catalog]
assert len(themes) == 36 and len({item['key'] for item in themes}) == 36
client = httpx.Client(base_url='http://localhost:8000/api/v1', headers={'Origin': 'http://localhost:3000'}, timeout=30)
manifest = json.loads(PRIVATE.read_text()) if PRIVATE.exists() else {'run': secrets.token_hex(4), 'accounts': []}

def write_manifest():
    PRIVATE.parent.mkdir(parents=True, exist_ok=True)
    PRIVATE.touch(mode=0o600, exist_ok=True)
    PRIVATE.chmod(0o600)
    PRIVATE.write_text(json.dumps(manifest, indent=2) + '\n')

def request(method, path, **kwargs):
    for attempt in range(5):
        response = client.request(method, path, **kwargs)
        if response.status_code != 429:
            if response.is_error:
                raise RuntimeError(f'{method} {path}: {response.status_code}: {response.text}')
            return response.json() if response.content else None
        print('Respecting API rate limit; waiting before continuing.', flush=True)
        time.sleep(30)
    raise RuntimeError(f'Rate limit did not clear: {path}')

samples = {
 'Fashion': [('Everyday cotton shirt','shirt',245000),('Weekend linen dress','dress',380000),('Everyday carry bag','bag',195000),('Relaxed overshirt','shirt',220000)],
 'Electronics': [('Studio headphones','tech',650000),('Everyday smartwatch','watch',390000),('Everyday smartphone','phone',2850000),('Studio listening set','tech',820000)],
 'Grocery & essentials': [('Seasonal fruit selection','fruit',65000),('Vegetable basket','vegetables',42000),('Pantry essentials','market',125000),('Weekly fruit box','fruit',89000)],
 'Home & furniture': [('Reading chair','chair',1850000),('Warm table light','lamp',450000),('Living room collection','home',4200000),('Accent chair','chair',1650000)],
 'Beauty & skincare': [('Daily skincare ritual','beauty',185000),('Color collection','makeup',245000),('Evening skincare edit','beauty',225000),('Everyday makeup essentials','makeup',165000)],
 'Sport & outdoor': [('Everyday training set','training',350000),('Refill bottle','bottle',125000),('Training backpack','bag',285000),('Session essentials','sport',420000)],
}

purpose = {
 'business':'Independent thinking. Thoughtful design. A studio for what comes next.',
 'portfolio':'Objects, ideas and places, considered from a personal point of view.',
 'blog':'Notes on design, places and things worth noticing.',
 'landing_page':'Thoughtful sound and everyday essentials, designed around your day.',
 'agency':'Strategy, identity and digital experiences, made with care.',
 'other':'A little space for shared interests, good ideas and the next chapter.',
}

refresh = len(sys.argv) > 1 and sys.argv[1] == 'refresh'
for index, theme in enumerate(themes):
    existing = next((item for item in manifest['accounts'] if item['theme_key'] == theme['key']), None)
    if existing and not refresh:
        continue
    if existing and refresh:
        auth = request('POST', '/auth/login', json={'email':existing['email'], 'password':existing['password']})
        existing['access_token'] = auth['access_token']
        write_manifest()
    if not existing:
        password = secrets.token_urlsafe(24)
        email = f"theme-review-{theme['key']}-{manifest['run']}@example.com"
        auth = request('POST', '/auth/register', json={'name': 'Theme Review Owner', 'email': email, 'password': password})
        existing = {'theme_key': theme['key'], 'website_type': theme['website_type'], 'name': theme['name'], 'email': email, 'password': password, 'access_token': auth['access_token']}
        manifest['accounts'].append(existing)
        write_manifest()
    client.headers['Authorization'] = 'Bearer ' + existing['access_token']
    if 'site_id' not in existing:
        site = request('POST', '/shops', json={'name': theme['name'], 'slug': f"tq-{theme['key']}-{manifest['run']}", 'website_type': theme['website_type'], 'theme_key': theme['key']})
        existing.update(site_id=site['id'], slug=site['slug'], url=('http://localhost:3000/store/' if theme['website_type'] == 'online_store' else 'http://localhost:3000/site/') + site['slug'])
        write_manifest()
    path = '/shops/' + existing['site_id']
    request('PATCH', path, json={'description': theme.get('subtitle', purpose.get(theme['website_type'], theme['description'])), 'contact_email': 'hello@example.com', 'address': 'Bangladesh'})
    if theme['website_type'] == 'online_store':
        if not existing.get('catalog_created'):
            categories = [request('POST', path + '/categories', json={'name': label}) for label in ['The essentials', 'Selected favorites']]
            for product_index, (name, image, price) in enumerate(samples[theme['category']]):
                request('POST', path + '/products', json={'name': name, 'description': 'A thoughtfully selected addition to the everyday. Local sample product for theme review.', 'price_minor': price, 'stock_quantity': 24, 'category_ids': [categories[product_index % 2]['id']], 'images': [{'image_url': f'/themes/assets/{image}.jpg', 'is_primary': True}], 'variants': [{'title': 'Classic', 'stock_quantity': 12}, {'title': 'Signature', 'stock_quantity': 8, 'price_minor': price + 25000}] if product_index == 0 else []})
            existing['catalog_created'] = True
            write_manifest()
    else:
        home = request('GET', path + '/pages?kind=page')['items'][0]
        existing['home_id'] = home['id']
        if refresh:
            home = request('PUT', path + '/pages/' + home['id'], json={'title': 'Home', 'slug': 'home', 'description': web_catalog['starters'][theme['website_type']][0]['body'], 'sections': web_catalog['starters'][theme['website_type']], 'expected_revision': home['revision']})
        request('POST', path + '/pages/' + home['id'] + '/publish', json={'expected_revision': home['revision']})
        if theme['website_type'] == 'blog' and not existing.get('posts_created'):
            for number, title in enumerate(['Finding beauty in the everyday', 'A slower way to see the world', 'Room for a new perspective']):
                post = request('POST', path + '/pages', json={'kind': 'post', 'title': title, 'slug': f'journal-{number+1}', 'description': 'Notes on design, daily rituals and paying attention to what matters.', 'sections': [{'id': 'story', 'type': 'text', 'heading': title, 'body': 'A collection of observations on the things that make ordinary days feel considered. This sample article can be edited from the Blog workspace.'}]})
                request('POST', path + '/pages/' + post['id'] + '/publish', json={'expected_revision': post['revision']})
            existing['posts_created'] = True
    request('POST', path + '/publish')
    write_manifest()
    print(f"{index+1}/36 {theme['key']}: account and published site ready", flush=True)
assert len(manifest['accounts']) == 36
print('36 separate theme accounts ready. Credentials are in the private local manifest.', flush=True)
