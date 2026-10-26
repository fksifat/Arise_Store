import json
import subprocess
from urllib.request import urlopen

for url, expected in [('http://localhost:3000/health', 'healthy'), ('http://localhost:8000/ready', 'ready')]:
    with urlopen(url, timeout=10) as response:
        assert response.status == 200 and json.load(response)['status'] == expected
result = subprocess.run(['docker', 'compose', 'exec', '-T', 'api', 'alembic', '-c', 'alembic.ini', 'check'], capture_output=True, text=True)
assert result.returncode == 0, result.stdout + result.stderr
print(result.stdout.strip())
subprocess.run(['docker', 'compose', 'config', '--quiet'], check=True)
subprocess.run(['bash', '-n', 'scripts/setup-local.sh', 'scripts/run-local.sh', 'scripts/backup.sh', 'scripts/test-postgres.sh', 'scripts/test-browser.sh', 'scripts/verify-local.sh'], check=True)
services = subprocess.check_output(['docker', 'compose', 'ps', '--format', 'json'], text=True)
rows = [json.loads(row) for row in services.splitlines() if row.strip()]
for name in ('api', 'web', 'postgres', 'redis'):
    assert any(row['Service'] == name and row['Health'] == 'healthy' for row in rows), name
print('PASS: web health, database/Redis readiness, schema alignment, Compose configuration, shell syntax and four healthy services.')
