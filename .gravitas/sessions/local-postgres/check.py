import json
import subprocess
from pathlib import Path
from urllib.request import urlopen
from dotenv import dotenv_values
from sqlalchemy import text
from sqlalchemy.engine import make_url
from app.config import settings
from app.database import engine

root=Path('.gravitas/sessions/local-postgres')
values=dotenv_values('.env')
url=make_url(settings.DATABASE_URL)
assert url.drivername=='postgresql+psycopg'
assert url.host=='127.0.0.1' and url.port==int(values['POSTGRES_PORT'])==5434
assert url.database==values['POSTGRES_DB'] and url.username==values['POSTGRES_USER']
assert url.password==values['POSTGRES_PASSWORD']
assert Path('.env').stat().st_mode & 0o777==0o600
assert subprocess.check_output(['docker','compose','port','postgres','5432'],text=True).strip()=='127.0.0.1:5434'
before=json.loads((root/'before-counts.json').read_text())
with engine.connect() as connection:
    assert connection.scalar(text('SELECT current_database()'))==url.database
    started=connection.scalar(text('SELECT pg_postmaster_start_time()::text'))
    revision=connection.scalar(text('SELECT version_num FROM alembic_version'))
    counts={name:connection.scalar(text('SELECT count(*) FROM '+name)) for name in before}
    assert counts==before, 'Existing application row counts changed'
    connection.execute(text('CREATE TEMP TABLE arise_local_connectivity_check (value integer) ON COMMIT DROP'))
    connection.execute(text('INSERT INTO arise_local_connectivity_check VALUES (42)'))
    assert connection.scalar(text('SELECT value FROM arise_local_connectivity_check'))==42
    connection.rollback()
container_code="from app.database import engine; from sqlalchemy import text; import json; c=engine.connect(); print(json.dumps({'database':c.scalar(text('SELECT current_database()')),'started':c.scalar(text('SELECT pg_postmaster_start_time()::text'))})); c.close()"
container=json.loads(subprocess.check_output(['docker','compose','exec','-T','api','python','-c',container_code],text=True))
assert container=={'database':url.database,'started':started}, 'Host and API reached different PostgreSQL instances'
for command in [
 ['venv/bin/alembic','-c','services/api/alembic.ini','current'],
 ['venv/bin/alembic','-c','services/api/alembic.ini','check'],
 ['docker','compose','config','--quiet'],
]:
    result=subprocess.run(command,capture_output=True,text=True)
    assert result.returncode==0,result.stdout+result.stderr
    if result.stdout.strip():print(result.stdout.strip())
for endpoint in ['http://localhost:8000/ready','http://localhost:3000/health']:
    with urlopen(endpoint,timeout=10) as response:assert response.status==200
with urlopen('http://localhost:3000/api/v1/public/store?shop=fashion-house',timeout=10) as response:
    assert response.status==200 and json.load(response)['slug']=='fashion-house'
(root/'after-counts.json').write_text(json.dumps(counts,indent=2)+'\n')
print(f'PASS: host psycopg read/write/rollback and Docker API use the same PostgreSQL database at 127.0.0.1:{url.port}; migration {revision}; {len(counts)} application table counts preserved; API and website healthy.')
