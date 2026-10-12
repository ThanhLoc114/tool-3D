"""Download the public TripoSR checkpoint in validated, resumable HTTP ranges."""
import concurrent.futures
import json
import os
from pathlib import Path
import time
import urllib.request

root = Path(__file__).resolve().parents[1] / '.local-ai' / 'models' / 'TripoSR'
root.mkdir(parents=True, exist_ok=True)
if (root / 'complete.json').exists():
    expected = json.loads((root / 'complete.json').read_text())['bytes']
    if (root / 'model.ckpt').stat().st_size == expected:
        print('TripoSR checkpoint already ready.', flush=True)
        raise SystemExit(0)
url = 'https://huggingface.co/stabilityai/TripoSR/resolve/main/model.ckpt'
probe = urllib.request.urlopen(urllib.request.Request(url, headers={'Range': 'bytes=0-1023'}), timeout=60)
total = int(probe.headers['Content-Range'].split('/')[-1])
probe.close()
chunk = 8 * 1024 * 1024
parts = root / 'parts'
parts.mkdir(exist_ok=True)

def download(i):
    start, end = i * chunk, min(total-1, (i+1)*chunk-1)
    target = parts / str(i)
    if target.exists() and target.stat().st_size == end-start+1:
        return
    for attempt in range(4):
        try:
            request = urllib.request.Request(url + '?part=' + str(i), headers={'Range': f'bytes={start}-{end}'})
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{total}':
                    raise ValueError('Server returned an invalid byte range')
                with open(str(target)+'.tmp', 'wb') as out:
                    while data := response.read(1024*1024):
                        out.write(data)
            if Path(str(target)+'.tmp').stat().st_size != end-start+1:
                raise ValueError('Incomplete byte range')
            os.replace(str(target)+'.tmp', target)
            return
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2*(attempt+1))

count = (total+chunk-1)//chunk
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    tasks = [pool.submit(download, i) for i in range(count)]
    for completed, future in enumerate(concurrent.futures.as_completed(tasks), 1):
        future.result()
        print(f'Downloaded {completed}/{count} parts', flush=True)
with open(root / 'model.ckpt.tmp', 'wb') as out:
    for i in range(count):
        with open(parts / str(i), 'rb') as part:
            while data := part.read(1024*1024):
                out.write(data)
os.replace(root / 'model.ckpt.tmp', root / 'model.ckpt')
urllib.request.urlretrieve('https://huggingface.co/stabilityai/TripoSR/resolve/main/config.yaml', root / 'config.yaml')
(root / 'complete.json').write_text(json.dumps({'bytes': total}), encoding='utf-8')
print('TripoSR checkpoint ready.', flush=True)
