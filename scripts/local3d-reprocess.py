"""Reprocess an existing local mesh without loading neural networks."""
import argparse,json,time
from pathlib import Path
import trimesh
from local3d_repair import repair_closed_surface
from local3d_surface import clean_surface
p=argparse.ArgumentParser();p.add_argument('--model',required=True);p.add_argument('--output',required=True);p.add_argument('--surface',choices=['balanced','detail'],required=True);a=p.parse_args()
status=lambda text:print('STATUS:'+text,flush=True)
start=time.perf_counter();status('Dùng lưới AI đã lưu; chỉ xử lý bề mặt, không dựng lại ảnh…')
mesh=trimesh.load(a.model,force='mesh');output=Path(a.output)
mesh.export(output.with_suffix('.raw.glb'),file_type='glb')
mesh,repair=repair_closed_surface(mesh,status)
mesh,report=clean_surface(mesh,status,profile=a.surface)
output.with_suffix('.repair.json').write_text(json.dumps(repair),encoding='utf-8')
output.with_suffix('.surface.json').write_text(json.dumps(report),encoding='utf-8')
temp=output.with_suffix('.glb.tmp');mesh.export(temp,file_type='glb');temp.replace(output)
output.with_suffix('.metrics.json').write_text(json.dumps({'seconds':round(time.perf_counter()-start,2),'reused_geometry':True,'faces':len(mesh.faces),'watertight':mesh.is_watertight}),encoding='utf-8')
status('Đã xử lý bề mặt từ lưới lưu trên máy.')
