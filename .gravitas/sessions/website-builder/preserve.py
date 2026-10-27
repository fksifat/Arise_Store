import sys,json,hashlib
from pathlib import Path
from sqlalchemy import text,inspect
from app.database import engine
path=Path('.gravitas/sessions/website-builder/original-data.json')
tables=['users','shops','shop_memberships','shop_domains','shop_theme_settings','subscriptions','payments','categories','products','product_categories','product_images','product_variants','customers','orders','order_items']
mode=sys.argv[1]
before=json.loads(path.read_text()) if mode=='after' else {}
result={}
with engine.connect() as connection:
 for table in tables:
  columns=before[table]['columns'] if mode=='after' else [column['name'] for column in inspect(engine).get_columns(table)]
  rows=[dict(row) for row in connection.execute(text('SELECT '+','.join('"'+column+'"' for column in columns)+' FROM "'+table+'" ORDER BY 1')).mappings()]
  encoded=json.dumps(rows,sort_keys=True,default=str,separators=(',',':')).encode()
  result[table]={'columns':columns,'count':len(rows),'sha256':hashlib.sha256(encoded).hexdigest()}
 if mode=='after':
  assert result==before,'Original data changed during the upgrade'
  assert connection.scalar(text("SELECT count(*) FROM shops WHERE website_type != 'online_store'"))==0
  assert connection.scalar(text('SELECT version_num FROM alembic_version'))=='0004'
if mode=='before':path.write_text(json.dumps(result,indent=2)+'\n')
else:Path('.gravitas/sessions/website-builder/data-preservation.json').write_text(json.dumps({'matches':True,'tables':len(tables),'counts':{table:item['count'] for table,item in result.items()}},indent=2)+'\n')
print(f'PASS: {mode} snapshot verified for {len(tables)} existing application tables; no row contents or credentials printed.')
