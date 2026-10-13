param([Parameter(Mandatory=$true)][string]$Image)
$ErrorActionPreference = 'Stop'
$taskImage = (Resolve-Path -LiteralPath $Image).Path
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
$env:HF_HUB_OFFLINE = '1'
$env:U2NET_HOME = (Resolve-Path '.local-ai/rembg-cache').Path
$taskPython = (Resolve-Path '.local-ai/hunyuan-venv/Scripts/python.exe').Path
if (Test-Path '.local-ai/hunyuan-verified.json') { Remove-Item -LiteralPath '.local-ai/hunyuan-verified.json' }
& $taskPython scripts/hunyuan-infer.py --image $taskImage --output .local-ai/hunyuan-verified.glb --resolution 127
if ($LASTEXITCODE) { throw 'Hunyuan inference failed; engine remains disabled.' }
& $taskPython scripts/local3d-validate.py --model .local-ai/hunyuan-verified.glb --marker .local-ai/hunyuan-verified.json --engine Hunyuan3D-2mini-Turbo
if ($LASTEXITCODE) { throw 'Hunyuan geometry verification failed; engine remains disabled.' }
