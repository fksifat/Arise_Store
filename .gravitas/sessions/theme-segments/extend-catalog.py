import json
from pathlib import Path
p=Path('services/api/app/theme_catalog.json')
base=json.loads(p.read_text())
assert len(base)==6, 'Run once against the original catalog'
by_key={theme['key']:theme for theme in base}
variants=[
 ('fashion-modern','fashion-noir','Fashion Noir','#252525','dress','A flowing dress photographed in natural light','THE AFTER HOURS EDIT','Make an\nentrance.','Distinctive pieces for the moments you make your own.','A cinematic fashion boutique with an immersive campaign, bold type and a sharp four-column collection.'),
 ('fashion-modern','fashion-runway','Fashion Runway','#b64238','fashion','A carefully arranged clothing collection','A FRESH PERSPECTIVE','Wear what\nmoves you.','A new perspective on getting dressed, from everyday staples to statement pieces.','An expressive fashion studio with a centered campaign, panoramic photography and oversized modern typography.'),
 ('tech-cosmetics','tech-circuit','Tech Circuit','#3974ed','phone','A smartphone with a clean industrial design','CONNECT WITH POSSIBILITY','Built for\nwhat’s next.','Explore devices and accessories that make your everyday work better.','A precision electronics shop with a dark campaign, compact product cards and clear technical presentation.'),
 ('tech-cosmetics','tech-studio','Tech Studio','#285f72','tech','Over-ear headphones photographed against a yellow background','THOUGHTFULLY CONNECTED','Good design.\nEvery day.','Discover technology with a place in your daily routine.','An airy device showroom with the product image first, cool blue tones and a generous two-column catalog.'),
 ('general-store','market-fresh','Fresh Pantry','#9c5131','vegetables','Fresh vegetables arranged together','GOOD FINDS, EVERY DAY','A little fresher.\nA little simpler.','Find produce, pantry staples and the small essentials on your everyday list.','An inviting pantry shop with warm cream, terracotta accents, rounded produce photography and spacious browsing.'),
 ('general-store','market-express','Market Express','#71480d','fruit','A colorful assortment of fresh fruit','THE EVERYDAY CHECKLIST','Your list.\nStart here.','Discover everyday essentials and bring your next basket together.','A bright essentials store with a compact yellow campaign, prominent collections and a dense five-column catalog.'),
 ('home-living','home-gallery','Home Gallery','#473b32','home','An inviting living room styled with natural materials','A SPACE TO CALL YOUR OWN','Live with\nwhat you love.','Explore furniture and finishing touches with a personal point of view.','An interiors gallery with full-width lifestyle photography, quiet serif type and large two-column product stories.'),
 ('home-living','home-scandi','Scandi Living','#a84b28','chair','A sculptural upholstered chair','ROOM FOR THE EVERYDAY','Less clutter.\nMore living.','Furniture, lighting and considered details for the rooms you use every day.','A Scandinavian-inspired home shop with architectural framing, warm clay accents and a crisp four-column catalog.'),
 ('beauty-studio','beauty-botanica','Botanical Ritual','#3d634e','beauty','A considered collection of personal-care products','YOUR DAILY PAUSE','Make room\nfor your ritual.','Build a personal routine with beauty and care essentials you enjoy using.','A calm beauty shop with sage tones, image-first storytelling and simple square product photography.'),
 ('beauty-studio','beauty-atelier','Beauty Atelier','#633a54','makeup','A studio arrangement of makeup and beauty products','THE BEAUTY EDIT','Beauty,\non your terms.','Explore color, care and the everyday favorites that feel like you.','A refined beauty atelier with a centered campaign, plum details and a polished four-column collection.'),
 ('sport-performance','sport-trail','Trail Supply','#dfb56d','bag','A durable backpack ready for everyday adventures','MAKE YOUR OWN WAY','Take the\nlong way.','Find practical gear for new routes, everyday movement and time outside.','A warm outdoor outfitter with immersive gear photography, earthy tones and an easy three-column catalog.'),
 ('sport-performance','sport-club','Active Club','#174c9a','training','Training equipment in a fitness studio','FIND YOUR EVERYDAY PACE','Move your way.\nEvery day.','Discover training gear and everyday essentials for the way you like to move.','An energetic sports shop with a blue split campaign, geometric imagery and bold product-led browsing.'),
]
for theme in base:theme['family']=theme['key']
new=[]
for family,key,name,accent,image,image_alt,eyebrow,title,subtitle,description in variants:
    new.append({**by_key[family],'key':key,'family':family,'name':name,'accent':accent,'image':f'/themes/assets/{image}.jpg','image_alt':image_alt,'eyebrow':eyebrow,'title':title,'subtitle':subtitle,'description':description,'preview_image_url':f'/themes/previews/{key}.jpg'})
# Keep the original default and group related designs for predictable browsing.
order=['fashion-modern','tech-cosmetics','general-store','home-living','beauty-studio','sport-performance']
all_themes=base+new
result=[theme for family in order for theme in all_themes if theme['family']==family]
assert len(result)==18 and len({theme['key'] for theme in result})==18
p.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
