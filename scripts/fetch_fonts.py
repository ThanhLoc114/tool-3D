"""Fetch OFL fonts from Google Fonts; bake variable weights into static TTFs."""
from pathlib import Path
import subprocess
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

root = Path(__file__).resolve().parents[1] / 'public' / 'fonts'
for folder, name, weight, filename in [('baloo2','Baloo2',800,'Baloo2%5Bwght%5D.ttf'),('nunito','Nunito',900,'Nunito%5Bwght%5D.ttf'),('fredoka','Fredoka',700,'Fredoka%5Bwdth%2Cwght%5D.ttf'),('quicksand','Quicksand',700,'Quicksand%5Bwght%5D.ttf'),('lilitaone','LilitaOne',400,'LilitaOne-Regular.ttf')]:
    source = root / f'{name}.source.ttf'
    for remote, local in [(filename,source),('OFL.txt',root/f'{name}-OFL.txt')]:
        if not local.exists():
            subprocess.run(['curl.exe','-f','-sS','-L','--max-time','40',f'https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/{remote}','-o',str(local)],check=True)
    font = TTFont(source)
    if 'fvar' in font:
        axes = {a.axisTag: weight if a.axisTag=='wght' else a.defaultValue for a in font['fvar'].axes}
        font = instantiateVariableFont(font,axes,inplace=True)
    font.save(root / f'{name}.ttf')
    source.unlink()
    print(f'Saved {name}',flush=True)
