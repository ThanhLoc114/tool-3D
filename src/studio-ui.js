import {mountNavigation} from './navigation.js';
import {mountEditHistory} from './edit-history.js';
import './studio-style.css';
const nav=[['/','Móc khóa chữ'],['/image.html','Logo từ ảnh'],['/clicker.html','Clicker MX'],['/fruit.html','Clicker trái cây'],['/qr.html','QR trưng bày'],['/baby.html','Kỷ niệm bé'],['/lamp.html','Ảnh → đèn 3D'],['/print-tools.html','Tiện ích in 3D']];
const palettes=[['Lavender','#b39ad8','#fff3df','#8d6cb5'],['Biển xanh','#82b7ce','#fff8e8','#456f89'],['Cà phê','#80502d','#fff0d5','#bf9267'],['Hoa hồng','#d49cb4','#fff4e8','#a06182'],['Vườn xanh','#88ab93','#faf4dd','#4d7561'],['Nắng mật','#dfb674','#fffae8','#9a733b']];
const designs={
 text:[['Chữ bong bóng','contour','baloo'],['Chữ viền nổi','contour','fredoka'],['Thẻ capsule','capsule','nunito'],['Bảng oval','oval','baloo'],['Thẻ gọn','ticket','quicksand'],['Chữ tối giản','contour','default']],
 image:[['Đường bao logo','contour'],['Huy hiệu tròn','circle'],['Thẻ bo góc','rounded'],['Huy hiệu oval','oval'],['Lục giác','hexagon'],['Thẻ capsule','capsule']],
 clicker:[['Logo một nút','contour',1,65],['Nút tròn','circle',1,60],['Hai nút ngang','capsule',2,90],['Ba nút','rounded',3,115],['Bốn nút','rounded',4,110],['Nút lục giác','hexagon',1,65]],
 qr:[['Bảng bo góc','rounded','thin','stand'],['Huy hiệu tròn','circle','double','flat'],['Thẻ vé','ticket','bold','flat'],['Bảng hoa','flower','thin','stand'],['Lục giác','hexagon','double','keychain'],['Thẻ dán tường','tag','none','flat']],
 baby:[['Trăng và bé','reference','stand'],['Khung bo góc','rounded','stand'],['Bảng vòm','arch','stand'],['Mây lượn sóng','scallop','stand'],['Bảng treo phẳng','rounded','flat'],['Mây không bệ','scallop','flat']],
 fruit:[['Thanh long oval','classic'],['Thanh long tròn','round'],['Thanh long dài','long']],
 lamp:[['Vật thể cầu','sphere'],['Vật thể trứng','egg'],['Vật thể capsule','capsule'],['Vật thể hộp','box']],
 utilities:[['Thử dung sai','tolerance'],['Khối chuẩn 20 mm','cube'],['Vách mỏng','wall']]
};
function options(kind){return (designs[kind]||[]).map(([label,shape,x,y,z],i)=>{const [,a,b,c]=palettes[i%palettes.length];let values={};
 if(kind==='text')values={bodyStyle:shape,font:x,basecolor:a,topcolor:b,rimHeight:i===1?2:0,rimWidth:.8,border:2.8,side:'left'};
 if(kind==='image'||kind==='clicker')values={'image-shape':shape,'image-basecolor':a,'image-border':2,'image-round':.5,...(kind==='clicker'?{'switch-count':x,'image-width':y}:{})};
 if(kind==='qr')values={shape,frame:x,mounting:y,baseColor:a,frameColor:c,width:y==='stand'?55:45};
 if(kind==='baby')values={frameStyle:shape,mounting:x,outlineColor:c,creamColor:b,accentColor:a,textColor:c};
 if(kind==='fruit')values={fruitStyle:shape};if(kind==='lamp')values={'lamp-shape':shape};if(kind==='utilities')values={calibration:shape};
 return {label,a,b,c,shape,values};})}
function preview(kind,shape,a,b,c){const forms={circle:'M50 10a40 40 0 1 0 0 80a40 40 0 1 0 0-80',oval:'M10 50a40 28 0 1 0 80 0a40 28 0 1 0-80 0',hexagon:'M25 12H75L96 50 75 88H25L4 50Z',capsule:'M28 25H72a25 25 0 0 1 0 50H28a25 25 0 0 1 0-50',arch:'M10 90V50a40 40 0 0 1 80 0V90Z',scallop:'M10 90V40Q0 10 25 20Q35 0 50 15Q70 0 80 25Q100 20 90 50V90Z',contour:'M8 60V35Q10 15 30 22Q50 5 60 25Q90 15 94 45V70Q85 90 60 78Q35 95 25 75Q4 80 8 60Z'};const path=forms[shape]||'M15 20H85Q95 20 95 30V70Q95 80 85 80H15Q5 80 5 70V30Q5 20 15 20Z';return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${path}" fill="${a}" stroke="${c}" stroke-width="4"/><text x="50" y="60" text-anchor="middle" font-size="${kind==='baby'?26:24}" font-weight="bold" fill="${b}">${kind==='qr'?'▦':kind==='baby'?'☾':kind==='clicker'?'▣':kind==='fruit'?'●':kind==='lamp'?'☼':kind==='utilities'?'±':'Aa'}</text></svg>`}
export function mountStudio(kind){
 mountEditHistory();
 const old=document.querySelector('.tool-nav');if(old)old.innerHTML=nav.map(([href,label])=>`<a href="${href}" class="${location.pathname===href?'active':''}" ${location.pathname===href?'aria-current="page"':''}>${label}</a>`).join('');
 mountNavigation();
 const panel=document.querySelector('main .image-design')||document.querySelector('main .panel')||document.querySelector('.utility-grid .panel');if(!panel)return;
 const box=document.createElement('details');box.className='studio-presets';box.open=true;box.innerHTML='<summary>Mẫu thiết kế sẵn</summary><p>Chọn kiểu dáng. Giữ nội dung của bạn và chỉnh tiếp sau khi chọn.</p><div class="preset-grid"></div>';
 for(const option of options(kind)){const button=document.createElement('button');button.type='button';button.className='preset-card';button.innerHTML=`<span class="preset-art" style="--a:${option.a};--b:${option.b};--c:${option.c}">${preview(kind,option.shape,option.a,option.b,option.c)}</span><span>${option.label}</span>`;button.dataset.label=option.label;button.dataset.group=option.group||'';button.onclick=()=>{box.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b===button));for(const [id,value] of Object.entries(option.values)){const el=document.getElementById(id);if(!el)continue;el.value=value;for(const suffix of ['-number','-slider']){const pair=document.getElementById(id+suffix);if(pair)pair.value=value}el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}if(kind==='lamp')document.getElementById('sample')?.click()};box.querySelector('.preset-grid').append(button)}
 panel.prepend(box);
 const viewer=document.querySelector('.viewer-bottom');if(viewer&&!document.getElementById('studio-reset')){const button=document.createElement('button');button.id='studio-reset';button.textContent='Vừa khung';button.onclick=()=>window.dispatchEvent(new Event('keycraft:fit'));viewer.append(button)}
}
