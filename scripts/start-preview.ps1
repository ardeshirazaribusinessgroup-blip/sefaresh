$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $projectDirectory 'tmp'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$running = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($running) { Write-Output 'A server is already listening on 127.0.0.1:3000'; exit 0 }
$previewProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1') -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'preview.log') -RedirectStandardError (Join-Path $logDirectory 'preview-error.log') -PassThru
Write-Output "Preview process started: $($previewProcess.Id)"
