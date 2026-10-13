import sys,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(root/'scripts'),str(root/'.local-ai/Hunyuan3D-2')]
import torch
from hy3dgen.shapegen.models.autoencoders.attention_blocks import MultiheadCrossAttention
from hunyuan_cpu import surface_kv_cache
torch.set_num_threads(4);torch.manual_seed(42)
m=MultiheadCrossAttention(width=64,heads=4).eval()
x=torch.randn(1,256,64);latent=torch.randn(1,128,64)
calls=[];handle=m.c_kv.register_forward_hook(lambda *args:calls.append(1))
with torch.inference_mode():
 expected=m(x,latent);calls.clear()
 with surface_kv_cache(m):
  for _ in range(3):torch.testing.assert_close(m(x,latent),expected)
 assert len(calls)==1 and m.data is None and not m.kv_cache
 other=latent+1;expected_other=m(x,other)
 with surface_kv_cache(m):torch.testing.assert_close(m(x,other),expected_other)
 try:
  with surface_kv_cache(m):
   m(x,latent);raise RuntimeError('fixture')
 except RuntimeError:pass
 assert m.data is None and not m.kv_cache
handle.remove();print('PASS: actual upstream attention matches without cache, projects once per surface and clears for other images/errors.')
