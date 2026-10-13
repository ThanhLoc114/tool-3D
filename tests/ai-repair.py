import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import numpy as np
import trimesh
from local3d_repair import repair_closed_surface

closed=trimesh.creation.icosphere(subdivisions=6,radius=20)
small=closed.copy()
keep=np.ones(len(small.faces),dtype=bool)
keep[:3]=False
small.update_faces(keep)
fixed,report=repair_closed_surface(small)
assert fixed.is_watertight
assert abs(fixed.volume/closed.volume-1)<.001
speck=trimesh.Trimesh([[60,0,0],[60,.01,0],[60,0,.01]],[[0,1,2]])
fixed,report=repair_closed_surface(trimesh.util.concatenate([closed,speck]))
assert fixed.is_watertight and report['removed_components']==1
large=closed.copy()
large.update_faces(large.triangles_center[:,2]<15)
try:repair_closed_surface(large)
except ValueError as error:assert 'vùng lớn' in str(error)
else:raise AssertionError('Do not silently cap a large missing region')
assert large.is_watertight is False
print('PASS: repairs small holes, removes open specks, preserves volume; rejects large missing regions without modifying source.')

