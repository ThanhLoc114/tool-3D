import pathlib,json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
p=pathlib.Path('src/font-catalog-extra.json');entries=json.loads(p.read_text())
chars=set('ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ')
script=set('caveat cookie courgette dancingscript greatvibes indieflower kaushanscript lobster lobstertwo pacifico permanentmarker sacramento satisfy shadowsintolight yellowtail'.split())
serif=set('bitter cinzel crimsontext dmserifdisplay frankruhllibre ibmplexserif lora merriweather notoserif patuaone playfairdisplay ptserif robotoslab slabo27px vollkorn zillaslab abrilfatface alice'.split())
for e in entries:
 file=pathlib.Path('public/fonts')/e['file'];f=TTFont(file)
 if 'fvar' in f:
  axes={a.axisTag: min(a.maxValue,max(a.minValue,700 if a.axisTag=='wght' else a.defaultValue)) for a in f['fvar'].axes}
  f=instantiateVariableFont(f,axes,inplace=True);f.save(file)
 name=f['name'].getDebugName(16) or f['name'].getDebugName(1) or e['id'];e['label']=name;e['vietnamese']=chars.issubset(set(map(chr,f.getBestCmap())))
 e['group']='Viết tay' if e['id'] in script else 'Có chân' if e['id'] in serif else 'Đậm / trang trí' if f['OS/2'].usWeightClass>=700 else 'Không chân'
 f.close()
p.write_text(json.dumps(entries,ensure_ascii=False,indent=2),encoding='utf-8');print('Prepared',len(entries),'fonts; Vietnamese:',sum(e['vietnamese'] for e in entries))
