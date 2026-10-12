import JSZip from 'jszip';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const xmlEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function meshXML(mesh,id,material){
  const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index,vertices=[],keys=new Map(),indices=[];
  for(let i=0;i<p.count;i++){
    const xyz=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Number(v.toFixed(5)));
    if(!xyz.every(Number.isFinite))throw Error('Mô hình chứa tọa độ không hợp lệ.');
    const key=xyz.join(',');if(!keys.has(key)){keys.set(key,vertices.length);vertices.push(xyz)}indices.push(keys.get(key));
  }
  const triangles=[];
  for(let i=0;i<(index?.count||p.count);i+=3){const t=[0,1,2].map(j=>indices[index?index.getX(i+j):i+j]);if(new Set(t).size===3)triangles.push(`<triangle v1="${t[0]}" v2="${t[1]}" v3="${t[2]}"/>`)}
  return `<object id="${id}" type="model" name="${xmlEscape(mesh.name)}" pid="1" pindex="${material}"><mesh><vertices>${vertices.map(v=>`<vertex x="${v[0]}" y="${v[1]}" z="${v[2]}"/>`).join('')}</vertices><triangles>${triangles.join('')}</triangles></mesh></object>`;
}
export async function export3MF(meshes, options={}){
  if(!meshes.length)throw Error('Chưa có mô hình để xuất.');
  const zip=new JSZip(),assemblyId=meshes.length+2;
  const groups=options?.groups||[meshes.map((_,i)=>i)];
  const assemblyXML=groups.map((indices,g)=>`<object id="${assemblyId+g}" type="model" name="Part_${g+1}"><components>${indices.map(i=>`<component objectid="${i+2}"/>`).join('')}</components></object>`).join('');
  const buildXML=groups.map((_,g)=>`<item objectid="${assemblyId+g}"/>`).join('');
  zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>');
  zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>');
  // Bambu Studio uses per-part extruder assignments in addition to 3MF display colors.
  const colors=[...new Set(meshes.map(m=>'#'+m.material.color.getHexString().toUpperCase()))];
  const slot=i=>colors.indexOf('#'+meshes[i].material.color.getHexString().toUpperCase())+1;
  zip.file('Metadata/model_settings.config',`<?xml version="1.0" encoding="UTF-8"?><config>${groups.map((indices,g)=>`<object id="${assemblyId+g}"><metadata key="name" value="Keycraft_${g+1}"/><metadata key="extruder" value="1"/>${indices.map(i=>`<part id="${i+2}" subtype="normal_part"><metadata key="name" value="${xmlEscape(meshes[i].name)}"/><metadata key="extruder" value="${slot(i)}"/><metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/></part>`).join('')}</object>`).join('')}</config>`);
  zip.file('Metadata/project_settings.config',JSON.stringify({filament_colour:colors,filament_type:colors.map(()=>'PLA'),filament_diameter:colors.map(()=>'1.75')}));
  zip.file('3D/3dmodel.model',`<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><metadata name="Application">Keycraft Image Studio</metadata><resources><basematerials id="1">${meshes.map(m=>`<base name="${xmlEscape(m.name)}" displaycolor="#${m.material.color.getHexString().toUpperCase()}FF"/>`).join('')}</basematerials>${meshes.map((m,i)=>meshXML(m,i+2,i)).join('')}${assemblyXML}</resources><build>${buildXML}</build></model>`);
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:4}});
}
export async function exportSTLs(meshes,instructions){
  if(!meshes.length)throw Error('Chưa có mô hình để xuất.');
  const zip=new JSZip(),exporter=new STLExporter();
  for(const mesh of meshes){const binary=exporter.parse(mesh,{binary:true});zip.file(`${xmlEscape(mesh.name)}.stl`,new Uint8Array(binary.buffer,binary.byteOffset,binary.byteLength))}
  zip.file('HUONG_DAN.txt',instructions||'Đơn vị mm. Chọn tất cả STL cùng lúc trong Bambu Studio và nhập thành một đối tượng nhiều phần. Giữ tọa độ tương đối giữa các phần. Gán filament cho từng phần, Slice và kiểm tra Preview trước khi in. File này không chứa profile máy in hoặc cấu hình AMS.');
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:4}});
}
