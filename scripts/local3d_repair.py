"""Repair small holes in AI meshes; reject large missing regions."""
import numpy as np
import trimesh
import pymeshlab as pm

def boundary_diameters(mesh):
    counts=np.bincount(mesh.edges_unique_inverse,minlength=len(mesh.edges_unique))
    boundary=mesh.edges_unique[counts==1]
    parent={int(vertex):int(vertex) for vertex in boundary.flat}
    def find(vertex):
        while parent[vertex]!=vertex:
            parent[vertex]=parent[parent[vertex]]
            vertex=parent[vertex]
        return vertex
    for a,b in boundary:
        parent[find(int(a))]=find(int(b))
    groups={}
    for vertex in parent:groups.setdefault(find(vertex),[]).append(vertex)
    return [float(np.linalg.norm(np.ptp(mesh.vertices[vertices],axis=0))) for vertices in groups.values()]

def repair_closed_surface(source,status=lambda message:None):
    mesh=source.copy()
    if not np.isfinite(mesh.vertices).all():raise ValueError('Bề mặt có tọa độ không hợp lệ.')
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.update_faces(mesh.unique_faces())
    mesh.merge_vertices(digits_vertex=8)
    mesh.remove_unreferenced_vertices()
    parts=sorted(mesh.split(only_watertight=False),key=lambda part:part.area,reverse=True)
    if not parts:raise ValueError('AI không tạo được bề mặt có thể sửa.')
    kept=[part for part in parts if part.area>=parts[0].area*.001]
    removed=len(parts)-len(kept)
    mesh=trimesh.util.concatenate(kept)
    mesh.fix_normals()
    trimesh.repair.fill_holes(mesh)
    if mesh.is_watertight:return mesh,{'repaired':not source.is_watertight,'holes':0,'removed_components':removed}
    status('AI đã dựng xong; đang sửa lỗ hở nhỏ và cạnh lỗi trên lưới…')
    surfaces=pm.MeshSet()
    surfaces.add_mesh(pm.Mesh(mesh.vertices,mesh.faces))
    surfaces.apply_filter('meshing_repair_non_manifold_edges',method='Remove Faces')
    surfaces.apply_filter('meshing_repair_non_manifold_vertices',vertdispratio=0)
    current=surfaces.current_mesh()
    intermediate=trimesh.Trimesh(current.vertex_matrix(),current.face_matrix(),process=False)
    holes=boundary_diameters(intermediate)
    if holes and max(holes)>mesh.extents[0]*.04:
        raise ValueError('Lưới AI thiếu một vùng lớn; không thể tự vá mà giữ đúng hình dáng. Bản lưới gốc đã được lưu.')
    surfaces.apply_filter('meshing_close_holes',maxholesize=1000,selfintersection=True)
    current=surfaces.current_mesh()
    repaired=trimesh.Trimesh(current.vertex_matrix(),current.face_matrix())
    repaired.fix_normals()
    if not repaired.is_watertight or not np.isfinite(repaired.vertices).all():
        raise ValueError('Đã thử sửa lưới nhưng vẫn chưa kín. Bản lưới gốc đã được lưu để kiểm tra.')
    return repaired,{'repaired':True,'holes':len(holes),'removed_components':removed}
