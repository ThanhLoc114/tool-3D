"""Reuse invariant cross-attention projections within one surface extraction."""
from contextlib import contextmanager

@contextmanager
def surface_kv_cache(decoder):
    modules=[m for m in decoder.modules() if hasattr(m,"kv_cache") and hasattr(m,"c_kv") and hasattr(m,"data")]
    old=[m.kv_cache for m in modules]
    for m in modules:
        m.data=None
        m.kv_cache=True
    try:yield
    finally:
        for m,value in zip(modules,old):
            m.data=None
            m.kv_cache=value
