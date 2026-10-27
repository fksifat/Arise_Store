import json
from pathlib import Path
kinds=[('business','Business website','Present your services and help people get in touch.','business-studio'),('portfolio','Portfolio','Show your work, experience and creative projects.','portfolio-canvas'),('blog','Blog','Publish articles and build a home for your writing.','blog-journal'),('landing_page','Landing page','Explain an offer and guide visitors to a clear next step.','landing-launch'),('online_store','Online store','Sell products with inventory, checkout and order management.','fashion-modern'),('agency','Agency website','Present your team, services and selected work.','agency-collective'),('other','Other website','Start with flexible pages and make the structure your own.','other-canvas')]
variants={
'business':[('business-studio','Business Studio','studio','#2358a8'),('business-classic','Business Classic','editorial','#245d50'),('business-bold','Business Bold','bold','#b7dbf5')],
'portfolio':[('portfolio-canvas','Portfolio Canvas','canvas','#b04b2c'),('portfolio-minimal','Portfolio Minimal','split','#39434e'),('portfolio-noir','Portfolio Noir','bold','#edc993')],
'blog':[('blog-journal','The Journal','journal','#843d50'),('blog-notebook','Notebook','editorial','#4a6652'),('blog-dispatch','Dispatch','studio','#2756a3')],
'landing_page':[('landing-launch','Launch','bold','#ccb6ff'),('landing-focus','Focus','split','#285b89'),('landing-spotlight','Spotlight','studio','#ad4635')],
'agency':[('agency-collective','The Collective','bold','#c8b7fa'),('agency-atelier','Agency Atelier','editorial','#76513a'),('agency-works','Selected Works','canvas','#236250')],
'other':[('other-canvas','Blank Canvas','studio','#3a5668'),('other-simple','Simple Pages','editorial','#435c79'),('other-statement','Statement','bold','#a7dccf')],
}
copy={
'business':('Your next chapter starts here.','Introduce your business, explain what you do, and make it easy for people to reach you.'),
'portfolio':('Work with a point of view.','A personal collection of projects, ideas and the details behind the work.'),
'blog':('Notes worth sharing.','Stories, observations and ideas, gathered in one place.'),
'landing_page':('One idea. A clear next step.','Present your offer, explain the benefits and invite people to learn more.'),
'agency':('Good ideas. Thoughtfully made.','Bring your services and selected work together in a website that feels like your team.'),
'other':('Make this space your own.','A flexible starting point for your ideas, information and next chapter.'),
}
def section(id,type,heading,**fields):return {'id':id,'type':type,'heading':heading,**fields}
def sections(kind):
 title,body=copy[kind]
 content=[section('intro','hero',title,eyebrow=dict((k,l) for k,l,_,_ in kinds)[kind],body=body,button_text='Explore',button_url='#details')]
 if kind in ('portfolio','agency'):
  content.append(section('details','gallery','Selected work',items=[{'heading':'Project one','body':'Add a project description and show the details that matter.','image_url':'/themes/assets/home.jpg','image_alt':'An interior with natural materials'},{'heading':'Project two','body':'Tell the story behind another piece of your work.','image_url':'/themes/assets/tech.jpg','image_alt':'Studio headphones'},{'heading':'Project three','body':'Share an idea, a case study or a creative experiment.','image_url':'/themes/assets/chair.jpg','image_alt':'A sculptural chair'}]))
 elif kind=='blog':content.append(section('details','posts','Latest writing'))
 else:content.append(section('details','features','What you will find here',items=[{'heading':'A clear introduction','body':'Explain what you do and who your website is for.'},{'heading':'Details that matter','body':'Share the services, information or ideas visitors need.'},{'heading':'An easy next step','body':'Help visitors explore your pages or get in touch.'}]))
 content.append(section('about','text','A little about us' if kind not in ('portfolio','blog') else 'A little about me',body='Use this space to share your story, your approach and what matters to you.'))
 content.append(section('contact','contact','Let’s start a conversation.',body='Get in touch to ask a question or talk about your next project.'))
 return content
catalog={'types':[{'key':k,'label':l,'description':d,'default_theme':t} for k,l,d,t in kinds],'themes':[],'starters':{k:sections(k) for k in variants}}
for kind,rows in variants.items():
 for key,name,presentation,accent in rows:
  catalog['themes'].append({'key':key,'website_type':kind,'name':name,'presentation':presentation,'accent':accent,'description':f'A {presentation} design for {dict((k,l.lower()) for k,l,_,_ in kinds)[kind]} pages, with editable sections and responsive layouts.','version':'1.0.0','preview_image_url':f'/themes/previews/{key}.jpg'})
Path('services/api/app/website_catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
