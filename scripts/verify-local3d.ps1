$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:HF_HOME = Join-Path $taskRoot '.local-ai/hf-cache'
$env:U2NET_HOME = Join-Path $taskRoot '.local-ai/rembg-cache'
if (!(Test-Path '.local-ai/ready.json') -or !(Test-Path '.local-ai/models/TripoSR/complete.json')) { throw 'Chưa cài đủ thư viện/trọng số. Chạy scripts/setup-local3d.ps1 trước.' }
if ((Test-Path '.local-ai/verified.json') -and (Test-Path '.local-ai/verified-model.glb')) { exit 0 }
& .local-ai/venv/Scripts/python.exe scripts/local3d-infer.py --image .local-ai/TripoSR/examples/chair.png --output .local-ai/verified-model.glb
if ($LASTEXITCODE -ne 0) {
    Set-Content -LiteralPath '.local-ai/verify-error.json' -Value '{"error":"Kiểm tra AI cục bộ chưa đạt. Xem artifacts/local-ai-verify-error.log và chạy lại setup."}'
    throw 'AI chưa chạy được lượt kiểm tra đầu tiên.'
}
& .local-ai/venv/Scripts/python.exe scripts/local3d-validate.py --model .local-ai/verified-model.glb --marker .local-ai/verified.json
if ($LASTEXITCODE -ne 0) { throw 'File 3D kiểm tra không hợp lệ.' }
Write-Output 'PASS: local image-to-3D inference and GLB export.'
