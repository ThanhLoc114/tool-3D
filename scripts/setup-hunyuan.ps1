$ErrorActionPreference = 'Stop'
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path '.local-ai/Hunyuan3D-2/.git')) {
    New-Item -ItemType Directory -Force -Path '.local-ai/Hunyuan3D-2' | Out-Null
    git -C .local-ai/Hunyuan3D-2 init
    git -C .local-ai/Hunyuan3D-2 remote add origin https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git
    git -C .local-ai/Hunyuan3D-2 fetch --depth 1 origin f8db63096c8282cb27354314d896feba5ba6ff8a
    if ($LASTEXITCODE) { throw 'Clone Hunyuan failed.' }
}
git -C .local-ai/Hunyuan3D-2 checkout f8db63096c8282cb27354314d896feba5ba6ff8a
if ($LASTEXITCODE) { throw 'Hunyuan version unavailable.' }
if (!(Test-Path '.local-ai/hunyuan-venv/Scripts/python.exe')) { python -m venv .local-ai/hunyuan-venv }
$taskPython = (Resolve-Path '.local-ai/hunyuan-venv/Scripts/python.exe').Path
& $taskPython -m pip install --progress-bar off -r scripts/hunyuan-requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu
if ($LASTEXITCODE) { throw 'Hunyuan dependency installation failed.' }
& $taskPython scripts/hunyuan-download.py
if ($LASTEXITCODE) { throw 'Hunyuan model download failed.' }
New-Item -ItemType Directory -Force -Path '.local-ai/rembg-cache' | Out-Null
if (!(Test-Path '.local-ai/rembg-cache/u2netp.onnx')) {
    Invoke-WebRequest 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx' -OutFile '.local-ai/rembg-cache/u2netp.onnx'
}
Write-Host 'Weights installed. Run verify-hunyuan.ps1 with a test image to enable this engine.'
