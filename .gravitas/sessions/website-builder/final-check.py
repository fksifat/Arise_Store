import json
import subprocess
from pathlib import Path
from urllib.request import urlopen

root = Path('.gravitas/sessions/website-builder')
checks = {
    'backend-postgres.log': '110 passed',
    'backend-sqlite.log': '109 passed, 1 skipped',
    'browser-final.log': '26 passed',
    'build-final.log': 'VERDICT: PASS',
    'visual-final.log': '36 desktop/mobile cases',
    'preservation-final.log': '15 existing application tables',
    'migration-sqlite.log': 'VERDICT: PASS',
}
for filename, expected in checks.items():
    content = (root / filename).read_text()
    assert expected in content and 'VERDICT: PASS' in content, filename
for url in ('http://localhost:3000/health', 'http://localhost:8000/ready'):
    with urlopen(url, timeout=10) as response:
        assert response.status == 200, url
catalog = json.loads(Path('services/api/app/website_catalog.json').read_text())
counts = {}
for website_type in catalog['types']:
    key = website_type['key']
    with urlopen('http://localhost:8000/api/v1/themes?website_type=' + key, timeout=10) as response:
        themes = json.load(response)
    assert len(themes) == (18 if key == 'online_store' else 3), key
    assert all(theme['website_type'] == key for theme in themes), key
    counts[key] = len(themes)
assert sum(counts.values()) == 36
services = subprocess.check_output(['docker', 'compose', 'ps', '--format', 'json'], text=True)
for service in map(json.loads, services.splitlines()):
    assert service['State'] == 'running' and service['Health'] == 'healthy', service['Service']
subprocess.run(['git', 'diff', '--check'], check=True)
assert json.loads((root / 'data-preservation.json').read_text())['matches'] is True
(root / 'evidence.json').write_text(json.dumps({
    'status': 'verified locally',
    'website_theme_counts': counts,
    'postgres_tests': 110,
    'sqlite_tests': {'passed': 109, 'skipped': 1},
    'browser_tests': 26,
    'new_theme_visual_cases': 36,
    'original_data_tables_preserved': 15,
    'production_build': 'passed',
    'schema_check': (root / 'schema-final.log').read_text().strip(),
    'evidence_logs': list(checks),
    'acceptance_evidence': {
        'website_types_and_themes': ['backend-postgres.log', 'browser-final.log', 'visual-final.log'],
        'dashboard_pages_posts_and_publication': ['browser-final.log'],
        'section_editing_order_visibility_and_responsive_rendering': ['browser-final.log', 'backend-postgres.log', 'visual-final.log'],
        'privacy_tenant_roles_safe_urls_and_revisions': ['backend-postgres.log', 'browser-final.log'],
        'public_routes_metadata_and_commerce_compatibility': ['browser-final.log'],
        'migration_data_preservation_regressions_and_build': list(checks),
    },
    'limits': ['Local deployment only', 'Structured sections with plain text and image URLs', 'No uploads, form processing or free-form canvas', 'Hosted operations and load testing remain launch work'],
}, indent=2) + '\n')
print('PASS: seven website types and 36 API themes; healthy local services; observed validation logs; preserved data; clean whitespace diff.')
