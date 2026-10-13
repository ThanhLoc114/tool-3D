import sys,tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from hunyuan_compat import patch_decoder
source='class HierarchicalVolumeDecoding:\n    next_points = torch.stack(nidx, dim=1)\nclass FlashVDMVolumeDecoding:\n    next_points = torch.stack(nidx, dim=1)\n'
with tempfile.TemporaryDirectory() as folder:
    file=Path(folder)/'decoder.py'
    file.write_text(source)
    patch_decoder(file)
    repaired=file.read_text()
    assert repaired.count('.to(dtype=dtype)')==1
    assert repaired.split('class FlashVDMVolumeDecoding:')[1]==source.split('class FlashVDMVolumeDecoding:')[1]
    patch_decoder(file)
    assert file.read_text()==repaired
import torch
indices=torch.tensor([[0,0,0],[64,64,64],[127,127,127]])
wrong=indices*torch.tensor(2.02/127,dtype=indices.dtype)+torch.tensor(-1.01,dtype=indices.dtype)
assert torch.unique(wrong,dim=0).shape[0]==1
points=indices.to(torch.float32)
correct=points*torch.tensor(2.02/127,dtype=points.dtype)+torch.tensor(-1.01,dtype=points.dtype)
assert torch.unique(correct,dim=0).shape[0]==3
assert torch.allclose(correct[-1],torch.tensor([1.01,1.01,1.01]),atol=1e-5)
print('PASS: preserves fractional sample coordinates, patches only the intended decoder, safely repeats.')
