"""Download only the official local shape model; never upload user images."""
import atexit, concurrent.futures, hashlib, json, os, time, urllib.request
from pathlib import Path
from filelock import FileLock
root = Path(__file__).resolve().parents[1] / '.local-ai/models/Hunyuan3D-2mini'
folder = root / 'hunyuan3d-dit-v2-mini-turbo'
folder.mkdir(parents=True, exist_ok=True)
lock=FileLock(str(root/'download.lock'))
lock.acquire(timeout=0)
atexit.register(lock.release)
base = 'https://huggingface.co/tencent/Hunyuan3D-2mini/resolve/f90a0f7df7d5e6f71109cf333f6a95a0ae3194a6/'
total = 3822584202
expected_hash = 'bdbcef30dd0149a281e17d5b5b1fdad1122c904e098a42f3100e04e03c247bc4'
target = folder / 'model.fp16.safetensors'
if target.exists() and target.stat().st_size == total:
    digest = hashlib.sha256()
    with open(target,'rb') as source:
        while data := source.read(1024*1024): digest.update(data)
    if digest.hexdigest()!=expected_hash: raise ValueError('Model SHA256 mismatch; remove the corrupted model file and retry')
    for name in ['LICENSE','NOTICE','hunyuan3d-dit-v2-mini-turbo/config.yaml']:
        if not (root/name).exists(): urllib.request.urlretrieve(base+name,root/name)
    (root/'complete.json').write_text(json.dumps({'bytes':total,'sha256':expected_hash}),encoding='utf-8')
    raise SystemExit(0)
chunk = 8 * 1024 * 1024
parts = folder / 'parts'
parts.mkdir(exist_ok=True)
def download(i):
    start, end = i*chunk, min(total-1, (i+1)*chunk-1)
    dest = parts / str(i)
    if dest.exists() and dest.stat().st_size == end-start+1: return
    for attempt in range(5):
        try:
            req = urllib.request.Request(base+'hunyuan3d-dit-v2-mini-turbo/model.fp16.safetensors?part='+str(i), headers={'Range':f'bytes={start}-{end}'})
            with urllib.request.urlopen(req, timeout=120) as response:
                if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{total}':
                    raise ValueError('Invalid download range')
                with open(str(dest)+'.tmp','wb') as out:
                    while data := response.read(1024*1024): out.write(data)
            if Path(str(dest)+'.tmp').stat().st_size != end-start+1: raise ValueError('Incomplete part')
            os.replace(str(dest)+'.tmp',dest)
            return
        except Exception:
            if attempt == 4: raise
            time.sleep(2*(attempt+1))
count = (total+chunk-1)//chunk
with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
    for n, result in enumerate(concurrent.futures.as_completed([pool.submit(download,i) for i in range(count)]),1):
        result.result()
        print(f'{n}/{count} parts',flush=True)
digest = hashlib.sha256()
with open(str(target)+'.tmp','wb') as out:
    for i in range(count):
        with open(parts/str(i),'rb') as source:
            while data := source.read(1024*1024):
                digest.update(data)
                out.write(data)
if digest.hexdigest() != expected_hash:
    raise ValueError('Downloaded model SHA256 does not match the official weights')
os.replace(str(target)+'.tmp',target)
for name in ['LICENSE','NOTICE','hunyuan3d-dit-v2-mini-turbo/config.yaml']:
    urllib.request.urlretrieve(base+name,root/name)
(root/'complete.json').write_text(json.dumps({'bytes':total,'sha256':expected_hash}),encoding='utf-8')

