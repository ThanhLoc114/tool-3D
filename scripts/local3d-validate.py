"""Validate a generated GLB before enabling local AI in the web tool."""
import argparse
import json
from pathlib import Path
import numpy as np
import trimesh
parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
parser.add_argument('--marker', required=True)
args = parser.parse_args()
mesh = trimesh.load(args.model, force='mesh')
if len(mesh.faces) < 100 or not np.isfinite(mesh.vertices).all() or not (mesh.extents > 0).all():
    raise ValueError('AI output has no usable 3D surface')
if not mesh.is_watertight:
    raise ValueError('Verification model is not watertight')
result = {'engine': 'TripoSR', 'device': 'cpu', 'test': 'image-to-glb',
          'vertices': len(mesh.vertices), 'faces': len(mesh.faces), 'watertight': True}
Path(args.marker).write_text(json.dumps(result), encoding='utf-8')
print('PASS: ' + json.dumps(result))
