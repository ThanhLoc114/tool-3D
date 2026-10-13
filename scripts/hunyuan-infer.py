"""Hunyuan3D-2mini Turbo shape-only inference, entirely on this computer."""
import argparse, gc, json, os, sys, time, types
from pathlib import Path
root = Path(__file__).resolve().parents[1]
print('STATUS:Khởi động bộ AI cục bộ; lần đầu có thể cần biên dịch thư viện xử lý ảnh…',flush=True)
sys.path.insert(0,str(root/'.local-ai/Hunyuan3D-2'))
from hunyuan_compat import patch_decoder
patch_decoder(root/'.local-ai/Hunyuan3D-2/hy3dgen/shapegen/models/autoencoders/volume_decoders.py')
os.environ.setdefault('HF_HUB_OFFLINE','1')
os.environ.setdefault('HY3DGEN_DEBUG','0')
os.environ.setdefault('OMP_NUM_THREADS','4')
os.environ.setdefault('MKL_NUM_THREADS','4')
os.environ.setdefault('OPENBLAS_NUM_THREADS','2')
os.environ.setdefault('NUMBA_NUM_THREADS','4')
import numpy as np
import torch
import trimesh
from PIL import Image
import rembg
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
from hy3dgen.shapegen.models.autoencoders import HierarchicalVolumeDecoding
from hy3dgen.shapegen.models.autoencoders import volume_decoders
from hy3dgen.shapegen.pipelines import instantiate_from_config
from accelerate import init_empty_weights
from safetensors import safe_open
import yaml
from local3d_cache import cache_key,read_latents,write_latents
volume_decoders.tqdm=lambda iterable,**kwargs: iterable

p=argparse.ArgumentParser()
p.add_argument('--image',required=True)
p.add_argument('--output',required=True)
p.add_argument('--resolution',type=int,choices=[127,255],default=255)
p.add_argument('--seed',type=int,default=2026)
args=p.parse_args()
started=time.time()
torch.set_num_threads(4)
torch.set_num_interop_threads(1)
def status(text): print('STATUS:'+text,flush=True)
key=cache_key(Path(args.image).read_bytes(),args.seed)
latent_file=root/'.local-ai/cache/hunyuan'/f'{key}.pt'
try:
    cached=read_latents(latent_file)
except Exception:
    # Keep a corrupt cache for diagnosis and rebuild from the original image.
    latent_file.replace(latent_file.with_suffix('.invalid'))
    cached=None
    status('Cache cũ không hợp lệ; AI sẽ dựng lại từ ảnh trên máy…')
class ProgressVolumeDecoder(HierarchicalVolumeDecoding):
    def __call__(self,latents,geo_decoder,**kwargs):
        count=0
        next_report=65536
        def decode(**inputs):
            nonlocal count,next_report
            count+=inputs['queries'].shape[1]
            if count>=next_report:
                status(f'Trích xuất bề mặt: đã xử lý {count:,} điểm mẫu…')
                next_report=(count//65536+1)*65536
            return geo_decoder(**inputs)
        return super().__call__(latents,decode,**kwargs)
status('Tách nền trên máy…')
image=Image.open(args.image).convert('RGBA')
if image.width*image.height>40_000_000: raise ValueError('Ảnh quá lớn.')
if image.getextrema()[3][0]==255:
    image=rembg.remove(image,session=rembg.new_session('u2netp'))
status('Nạp Hunyuan3D-2mini Turbo trên CPU; không gửi ảnh ra ngoài…')
checkpoint=root/'.local-ai/models/Hunyuan3D-2mini/hunyuan3d-dit-v2-mini-turbo'
config=yaml.safe_load((checkpoint/'config.yaml').read_text())
def load_component(name):
    with init_empty_weights(): module=instantiate_from_config(config[name])
    with safe_open(str(checkpoint/'model.fp16.safetensors'),framework='pt',device='cpu') as weights:
        state={key[len(name)+1:]:weights.get_tensor(key).float() for key in weights.keys() if key.startswith(name+'.')}
        module.load_state_dict(state,strict=name!='vae',assign=True)
    if name=='conditioner':
        layers=module.main_image_encoder.model.encoder.layer
        for i,layer in enumerate(layers):
            if (i+1)%10==0:
                layer.register_forward_hook(lambda m,inputs,output,i=i: status(f'Phân tích ảnh: {i+1}/{len(layers)} lớp.'))
    return module.eval()
# Keep only the current stage in memory, instead of all three networks.
placeholder=torch.nn.Identity()
placeholder.guidance_embed=True
pipe=Hunyuan3DDiTFlowMatchingPipeline(conditioner=load_component('conditioner') if cached is None else torch.nn.Identity(),model=placeholder,vae=torch.nn.Identity(),
    scheduler=instantiate_from_config(config['scheduler']),
    image_processor=instantiate_from_config(config['image_processor']),device='cpu',dtype=torch.float32)
# The encoder and DiT are needed only in their respective stages. Release them
# before the next stage, keeping headroom on a 16 GB Windows computer.
encode=pipe.encode_cond
def encode_and_release(self,**kwargs):
    status('AI đang đọc ảnh và suy luận hình khối…')
    result=encode(**kwargs)
    self.conditioner=None
    gc.collect()
    self.model=load_component('model')
    self.vae=load_component('vae')
    self.vae.volume_decoder=ProgressVolumeDecoder()
    return result
pipe.encode_cond=types.MethodType(encode_and_release,pipe)
export=pipe._export
def export_and_release(self,*a,**kwargs):
    if cached is None:
        write_latents(latent_file,a[0])
    self.model=None
    gc.collect()
    status('Trích xuất bề mặt 3D; bước này có thể lâu hơn suy luận…')
    return export(*a,**kwargs)
pipe._export=types.MethodType(export_and_release,pipe)
gc.collect()
def progress(step,t,output): status(f'AI suy luận hình khối: bước {step+1}/5. Sau đó trích xuất bề mặt…')
status('AI đang suy luận hình khối; CPU có thể mất nhiều phút…')
with torch.inference_mode():
    if cached is not None:
        status('Dùng lại suy luận đã lưu trên máy; trích xuất bề mặt ở mức chi tiết đã chọn…')
        pipe.vae=load_component('vae')
        pipe.vae.volume_decoder=ProgressVolumeDecoder()
        mesh=pipe._export(cached,octree_resolution=args.resolution,num_chunks=2048,enable_pbar=False)[0]
    else:
        mesh=pipe(image=image,num_inference_steps=5,guidance_scale=5.0,
            generator=torch.Generator('cpu').manual_seed(args.seed),octree_resolution=args.resolution,
            num_chunks=2048,mc_algo='mc',callback=progress,callback_steps=1,enable_pbar=False)[0]
if mesh is None or len(mesh.faces)<100: raise ValueError('AI không tạo được bề mặt hợp lệ.')
status('Kiểm tra bề mặt và xuất mô hình…')
del pipe
gc.collect()
mesh.remove_unreferenced_vertices()
mesh.fix_normals()
trimesh.repair.fill_holes(mesh)
if not np.isfinite(mesh.vertices).all(): raise ValueError('Bề mặt có tọa độ không hợp lệ.')
if not mesh.is_watertight: raise ValueError('AI tạo bề mặt chưa kín; dùng ảnh một vật thể rõ hơn để dựng lại.')
output=Path(args.output)
output.parent.mkdir(parents=True,exist_ok=True)
from local3d_surface import clean_surface
mesh.export(output.with_suffix('.raw.glb'),file_type='glb')
mesh,surface_report=clean_surface(mesh,status)
output.with_suffix('.surface.json').write_text(json.dumps(surface_report),encoding='utf-8')
temp=output.with_suffix('.glb.tmp')
mesh.export(str(temp),file_type='glb')
temp.replace(output)
Path(args.output).with_suffix('.metrics.json').write_text(json.dumps({'engine':'hunyuan-mini',
    'seconds':round(time.time()-started),'faces':len(mesh.faces),'watertight':bool(mesh.is_watertight),
    'resolution':args.resolution,'seed':args.seed}),encoding='utf-8')
status('Đã dựng bằng Hunyuan3D-2mini. Kiểm tra chi tiết và mặt sau trước khi in.')
