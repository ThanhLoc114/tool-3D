"""Validated local latent cache. Never loads arbitrary Python objects."""
import hashlib
from pathlib import Path
import torch

def cache_key(image_bytes,seed):
    return hashlib.sha256(image_bytes+f'hunyuan-mini-turbo-f90a0f7-v1-{seed}'.encode()).hexdigest()

def read_latents(file):
    if not Path(file).exists(): return None
    tensor=torch.load(file,map_location='cpu',weights_only=True)
    if not isinstance(tensor,torch.Tensor) or tensor.shape!=(1,3072,64) or tensor.dtype!=torch.float32 or not torch.isfinite(tensor).all():
        raise ValueError('Cache AI không hợp lệ; xóa tệp cache cục bộ và dựng lại.')
    return tensor

def write_latents(file,tensor):
    file=Path(file)
    file.parent.mkdir(parents=True,exist_ok=True)
    temp=file.with_suffix('.tmp')
    torch.save(tensor.detach().cpu(),temp)
    temp.replace(file)
