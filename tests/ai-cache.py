import sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import torch
from local3d_cache import cache_key,read_latents,write_latents
assert cache_key(b'image',2026)!=cache_key(b'other',2026)
assert cache_key(b'image',2026)!=cache_key(b'image',2027)
with tempfile.TemporaryDirectory() as folder:
    file=Path(folder)/'cache/model.pt'
    assert read_latents(file) is None
    tensor=torch.randn(1,3072,64)
    write_latents(file,tensor)
    assert torch.equal(read_latents(file),tensor)
    write_latents(file,tensor+1)
    assert torch.equal(read_latents(file),tensor+1)
    for invalid in [torch.zeros(1,2,3),torch.full((1,3072,64),float('nan'))]:
        write_latents(file,invalid)
        try: read_latents(file)
        except ValueError: pass
        else: raise AssertionError('Invalid cache was accepted')
print('PASS: cache separates images/seeds, round-trips tensors, replaces atomically, rejects invalid data.')
