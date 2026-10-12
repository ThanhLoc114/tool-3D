param([int]$InstallerPid)
$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot
if ($InstallerPid -gt 0) { Wait-Process -Id $InstallerPid -ErrorAction SilentlyContinue }
& .local-ai/venv/Scripts/python.exe -c 'import torch,transformers,skimage,rembg,omegaconf,trimesh,einops; print("Local AI dependencies ready")'
if ($LASTEXITCODE -ne 0) { throw 'Thư viện AI chưa sẵn sàng. Chạy scripts/setup-local3d.ps1 để sửa.' }
Set-Content -LiteralPath '.local-ai/ready.json' -Value '{"engine":"TripoSR","device":"cpu"}'
