$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot
if (!(Test-Path '.local-ai/TripoSR/tsr/system.py')) {
    git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git .local-ai/TripoSR
    if ($LASTEXITCODE -ne 0) { throw 'Không tải được TripoSR.' }
}
if (!(Test-Path '.local-ai/venv/Scripts/python.exe')) { python -m venv .local-ai/venv }
& .local-ai/venv/Scripts/python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE -ne 0) { throw 'Không cài được PyTorch.' }
& .local-ai/venv/Scripts/python.exe -m pip install 'numpy<2' 'transformers==4.35.2' 'huggingface-hub<1' 'omegaconf==2.3.0' 'einops==0.7.0' pillow trimesh imageio 'rembg==2.0.57' onnxruntime scikit-image
if ($LASTEXITCODE -ne 0) { throw 'Không cài được thư viện AI.' }
& .local-ai/venv/Scripts/python.exe -c 'import torch,transformers,skimage,rembg,omegaconf,trimesh'
if ($LASTEXITCODE -ne 0) { throw 'Kiểm tra môi trường AI thất bại.' }
Set-Content -LiteralPath '.local-ai/ready.json' -Value '{"engine":"TripoSR","device":"cpu"}'
& .local-ai/venv/Scripts/python.exe scripts/local3d-download.py
if ($LASTEXITCODE -ne 0) { throw 'Chưa tải xong trọng số. Chạy lại setup để tiếp tục.' }
& powershell -NoProfile -File scripts/verify-local3d.ps1
if ($LASTEXITCODE -ne 0) { throw 'Kiểm tra AI chưa đạt; xem nhật ký.' }
Write-Output 'AI cục bộ đã sẵn sàng. Lần tạo đầu tải trọng số; ảnh không rời máy.'
