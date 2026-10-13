"""Verify physical denoising, speck removal and printability on an organic fixture."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import numpy as np
import trimesh
from local3d_surface import clean_surface

sphere=trimesh.creation.icosphere(subdivisions=4,radius=20)
rng=np.random.default_rng(42)
sphere.vertices*=1+rng.normal(0,.009,(len(sphere.vertices),1))
speck=trimesh.creation.icosphere(subdivisions=1,radius=.03)
speck.apply_translation([60,0,0])
source=trimesh.util.concatenate([sphere,speck])
cleaned,report=clean_surface(source)
assert report['removed_components']==1
assert cleaned.is_watertight and len(cleaned.split())==1
assert np.allclose(cleaned.bounds,sphere.bounds,atol=1e-8)
assert np.isfinite(cleaned.vertices).all()
assert abs(cleaned.volume/sphere.volume-1)<.03
rough=lambda mesh:np.std(np.linalg.norm(mesh.vertices,axis=1))
assert rough(cleaned)<rough(sphere)*.7, 'Remeshing must reduce physical surface noise'
print('PASS: removes a disconnected speck, reduces surface noise, preserves size/volume and one closed body.')

detail,detail_report=clean_surface(source,profile="detail")
assert detail.is_watertight and len(detail.split())==1
assert len(detail.faces)==len(sphere.faces), "Detail mode must retain AI tessellation"
assert np.allclose(detail.bounds,sphere.bounds,atol=1e-8)
assert detail_report['profile']=='detail'
assert rough(detail)<rough(sphere), "Gentle filtering must still reduce noise"
print('PASS: detail mode keeps tessellation, closed geometry and size while filtering more gently.')
