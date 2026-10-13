"""Physical cleanup of organic AI surfaces, before mechanical pockets are cut."""
import numpy as np
import pymeshlab as pm
import trimesh

def clean_surface(source, status=lambda text: None, profile="balanced"):
    if profile not in ("balanced","detail"): raise ValueError("Chế độ bề mặt không hợp lệ.")
    mesh=source.copy()
    if not np.isfinite(mesh.vertices).all() or np.any(mesh.extents<=0):
        raise ValueError('Bề mặt đầu vào không hợp lệ.')
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.update_faces(mesh.unique_faces())
    mesh.remove_unreferenced_vertices()
    parts=sorted(mesh.split(only_watertight=False),key=lambda item:item.area,reverse=True)
    if not parts: raise ValueError('Mô hình không có bề mặt.')
    # Remove only disconnected specks; preserve larger separate features.
    kept=[part for part in parts if part.area>=parts[0].area*.001]
    mesh=trimesh.util.concatenate(kept)
    bounds=mesh.bounds.copy()
    dimensions=mesh.extents.copy()
    edge=dimensions[0]*.8/120
    surfaces=pm.MeshSet()
    surfaces.add_mesh(pm.Mesh(mesh.vertices,mesh.faces))
    if profile=="balanced":
        status('Tái chia đều lưới để loại tam giác mảnh và gợn ở khớp nối…')
        surfaces.apply_filter('meshing_isotropic_explicit_remeshing',iterations=5,
            targetlen=pm.PureValue(edge),featuredeg=100,checksurfdist=True,
            maxsurfdist=pm.PureValue(edge),reprojectflag=False)
    status('Lọc nhẹ để giữ nét nhỏ…' if profile=="detail" else 'Lọc gợn bề mặt trên lưới mới; giữ kích thước mô hình…')
    surfaces.apply_filter('apply_coord_taubin_smoothing',stepsmoothnum=6 if profile=="detail" else 30,lambda_=.5,mu=-.53)
    result=surfaces.current_mesh()
    cleaned=trimesh.Trimesh(result.vertex_matrix(),result.face_matrix())
    cleaned.fix_normals()
    if not np.isfinite(cleaned.vertices).all() or np.any(cleaned.extents<=0) or not cleaned.is_watertight:
        raise ValueError('Làm sạch tạo bề mặt không hợp lệ; mô hình gốc được giữ lại.')
    cleaned.vertices=(cleaned.vertices-cleaned.bounds[0])*dimensions/cleaned.extents+bounds[0]
    return cleaned,{'version':2,'profile':profile,'removed_components':len(parts)-len(kept),
        'faces_before':len(source.faces),'faces_after':len(cleaned.faces),'watertight':True}

if __name__=='__main__':
    import argparse,json,sys
    sys.stdout.reconfigure(encoding='utf-8')
    from pathlib import Path
    parser=argparse.ArgumentParser()
    parser.add_argument('--model',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    model=Path(args.model)
    output=Path(args.output)
    source=trimesh.load(model,force='mesh')
    cleaned,report=clean_surface(source,lambda message:print('STATUS:'+message,flush=True))
    output.parent.mkdir(parents=True,exist_ok=True)
    original=output.with_suffix('.raw.glb')
    if not original.exists(): source.export(original,file_type='glb')
    # An older preview may still be reading the original on Windows. Keep its
    # file intact and publish a separate cleaned GLB through the report.
    destination=output.with_suffix('.cleaned.glb') if output.exists() else output
    if destination!=output: report['file']=destination.name
    temp=destination.with_suffix('.glb.tmp')
    cleaned.export(temp,file_type='glb')
    temp.replace(destination)
    output.with_suffix('.surface.json').write_text(json.dumps(report),encoding='utf-8')
    print('PASS:',report)
