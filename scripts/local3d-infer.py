"""TripoSR on CPU, using skimage marching cubes to avoid a CUDA compiler on Windows."""
import argparse
import os
import sys
import types
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / '.local-ai' / 'TripoSR'))
import numpy as np
import torch
from skimage.measure import marching_cubes

def cpu_marching_cubes(volume, threshold):
    verts, faces, _, _ = marching_cubes(volume.cpu().numpy(), level=threshold)
    # torchmcubes returns x,y,z for an array whose axes are z,y,x.
    return torch.from_numpy(verts[:, [2, 1, 0]].copy()), torch.from_numpy(faces.copy().astype(np.int64))

shim = types.ModuleType('torchmcubes')
shim.marching_cubes = cpu_marching_cubes
sys.modules['torchmcubes'] = shim
from tsr.system import TSR
from tsr.utils import remove_background, resize_foreground, to_gradio_3d_orientation
from PIL import Image
import rembg
import trimesh

parser = argparse.ArgumentParser()
parser.add_argument('--image', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
torch.set_num_threads(min(4, os.cpu_count() or 4))
print('STATUS:Nạp bộ AI TripoSR trên máy…', flush=True)
checkpoint = root / '.local-ai' / 'models' / 'TripoSR'
model = TSR.from_pretrained(str(checkpoint) if (checkpoint / 'complete.json').exists() else 'stabilityai/TripoSR', config_name='config.yaml', weight_name='model.ckpt')
model.renderer.set_chunk_size(2048)
model.to('cpu')
image = Image.open(args.image)
if image.width * image.height > 40_000_000:
    raise ValueError('Ảnh quá lớn, giảm kích thước ảnh rồi thử lại.')
print('STATUS:Tách nền ảnh cục bộ…', flush=True)
image = remove_background(image, rembg.new_session('u2netp'))
image = resize_foreground(image, .85)
arr = np.asarray(image).astype(np.float32) / 255
image = Image.fromarray((arr[:, :, :3] * arr[:, :, 3:4] * 255 + (1-arr[:, :, 3:4])*127.5).astype(np.uint8))
print('STATUS:AI đang dựng hình mọi phía trên CPU; có thể mất vài phút…', flush=True)
with torch.no_grad():
    codes = model([image], device='cpu')
print('STATUS:Đang trích xuất bề mặt 3D…', flush=True)
mesh = model.extract_mesh(codes, False, resolution=192)[0]
if not len(mesh.vertices) or not len(mesh.faces):
    raise ValueError('AI chưa tìm được vật thể. Dùng ảnh vật thể rõ và nền đơn giản.')
mesh.remove_unreferenced_vertices()
# Drop disconnected reconstruction speckles; retain the main physical object.
components = mesh.split(only_watertight=False)
if len(components) > 1:
    mesh = max(components, key=lambda part: part.area)
print('STATUS:Làm mịn bề mặt, giữ hình khối và chi tiết…', flush=True)
trimesh.smoothing.filter_taubin(mesh, lamb=0.5, nu=0.53, iterations=6)
trimesh.repair.fill_holes(mesh)
mesh.fix_normals()
mesh = to_gradio_3d_orientation(mesh)
Path(args.output).parent.mkdir(parents=True, exist_ok=True)
mesh.export(args.output)
print('STATUS:Đã hoàn tất mô hình 3D.', flush=True)
