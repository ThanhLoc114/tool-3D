"""Compatibility repair for the pinned upstream hierarchical decoder."""
from pathlib import Path

def patch_decoder(file):
    file=Path(file)
    source=file.read_text(encoding='utf-8')
    start=source.index('class HierarchicalVolumeDecoding:')
    end=source.index('class FlashVDMVolumeDecoding:',start)
    block=source[start:end]
    original='next_points = torch.stack(nidx, dim=1)'
    repaired=original+'.to(dtype=dtype)'
    if repaired in block: return
    if block.count(original)!=1: raise RuntimeError('Unsupported Hunyuan decoder version; cannot apply coordinate repair safely')
    block=block.replace(original,repaired)
    file.write_text(source[:start]+block+source[end:],encoding='utf-8')
