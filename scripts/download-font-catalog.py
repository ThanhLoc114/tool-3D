import json,urllib.request,concurrent.futures,pathlib
root=pathlib.Path('public/fonts');out=root/'catalog';out.mkdir(exist_ok=True)
req=urllib.request.Request('https://api.github.com/repos/google/fonts/git/trees/main?recursive=1',headers={'User-Agent':'Keycraft'})
with urllib.request.urlopen(req,timeout=60) as r: tree=json.load(r)['tree']
pathlib.Path('artifacts').mkdir(exist_ok=True)
pathlib.Path('artifacts/google-fonts-tree.json').write_text(json.dumps(tree),encoding='utf-8')
families='anton archivo archivoblack asap assistant barlow barlowcondensed bebasneue bitter bungee cabin cairo catamaran caveat chivo cinzel comfortaa concertone cookie courgette cousine crimsontext dancingScript dmSans dmSerifDisplay dosis exo exo2 figtree fjallaone frankruhllibre greatvibes heebo hind ibmplexsans ibmplexserif inconsolata indieflower inter josefinsans jost kanit karla kaushanscript lato lemon lemonada lexend lobstertwo lobster lora merriweather montserrat mulish notoserif oswald outfit overpass oxygen pacifico passionone patuaone paytoneone permanentmarker playfairdisplay poppins prompt ptSans ptSerif rajdhani raleway righteous roboto robotocondensed robotoslab rubik russoone sacramento satisfy shadowsintolight signika slabo27px sourcesans3 spacegrotesk specialelite teko tinos titilliumweb ubuntu urbanist varelaRound vollkorn worksans yanonekaffeesatz yellowtail zillaslab abel abrilfatface acme alata alfaSlabOne alice allerta arima audiowide balooBhai2 balooChettan2 boogaloo breeSerif caprasimo chelseaMarket chonburi'.lower().split()
paths={}
for t in tree:
 p=t['path'];bits=p.split('/')
 if len(bits)==3 and bits[0]=='ofl' and p.endswith('.ttf') and 'Italic' not in p:
  paths.setdefault(bits[1],[]).append(p)
chosen=[]
for name in families:
 if name in paths and name!='tinos' and name not in chosen:chosen.append(name)
chosen=chosen[:94]
if len(chosen)<94:raise RuntimeError(len(chosen))
def get(path,dest):
 if dest.exists() and dest.stat().st_size>100:return
 url='https://raw.githubusercontent.com/google/fonts/main/'+urllib.parse.quote(path,safe='/')
 for attempt in range(3):
  try:
   with urllib.request.urlopen(url,timeout=60) as r:dest.write_bytes(r.read())
   return
  except Exception:
   if attempt==2:raise
import urllib.parse
entries=[]
def download(name):
 candidates=paths[name];p=sorted(candidates,key=lambda v:(0 if '-Bold.ttf' in v else 1 if '[' in v else 2 if '-Regular.ttf' in v else 3,v))[0]
 get(p,out/(name+'.ttf'));get('ofl/'+name+'/OFL.txt',out/(name+'-OFL.txt'))
 return {'id':name,'file':'catalog/'+name+'.ttf','label':name,'source':'https://github.com/google/fonts/tree/main/ofl/'+name}
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
 for i,e in enumerate(ex.map(download,chosen)):
  entries.append(e)
  if i%10==0:print('Downloaded',i+1,flush=True)
pathlib.Path('src/font-catalog-extra.json').write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8')
print('DONE',len(entries),flush=True)
