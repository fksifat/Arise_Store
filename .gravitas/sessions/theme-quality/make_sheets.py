from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parent
repo=root.parents[2]
accounts=json.loads((repo/'.data/theme-review/accounts.json').read_text())['accounts']
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',16)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
for group,items in [('websites',[a for a in accounts if a['website_type']!='online_store']),('stores',[a for a in accounts if a['website_type']=='online_store'])]:
 for width in (1440,390):
  cell_w,cell_h=(360,295) if width==1440 else (220,510)
  sheet=Image.new('RGB',(cell_w*6,cell_h*3),'#e8ecf1')
  draw=ImageDraw.Draw(sheet)
  for index,account in enumerate(items):
   path=root/f"{account['theme_key']}-{width}.png"
   assert path.exists(),path
   image=Image.open(path).convert('RGB')
   image=image.crop((0,0,width,min(image.height,1000 if width==1440 else 844)))
   image.thumbnail((cell_w-16,cell_h-48))
   x=(index%6)*cell_w+8;y=(index//6)*cell_h+38
   sheet.paste(image,(x,y));draw.text((x,y-30),account['name'],font=font,fill='#17253a')
   draw.text((x,y+image.height+3),account['theme_key'],font=small,fill='#526174')
  sheet.save(root/f'{group}-{width}-overview.jpg',quality=88)
print('Four overview sheets created from all 72 reviewed screenshots.')
