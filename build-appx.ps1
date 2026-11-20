# ══════════════════════════════════════════════════════════════════
# Wanshuang Launcher - Microsoft Store (MSIX) 构建脚本
# 用法: powershell -ExecutionPolicy Bypass -File build-appx.ps1
# 产物: dist\Wanshuang Launcher 1.2.0.msix
# ══════════════════════════════════════════════════════════════════
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$tmp = Join-Path $env:TEMP 'opencode\wsl-appx-build'
$dist = Join-Path $root 'dist'

# ── 工具路径（Windows SDK 10.0.26100，必须用新版，旧版对 appx/msix 签名有 bug）──
$sdkDir = Join-Path $env:TEMP 'opencode\sdkbt\ext\bin\10.0.26100.0\x64'
$makeappx = Join-Path $sdkDir 'makeappx.exe'
$signtool = Join-Path $sdkDir 'signtool.exe'
$cert = Join-Path $root 'build\cert.pfx'
$certPwd = 'wsl@2026'   # 生产环境请修改

if (!(Test-Path $makeappx)) { throw "makeappx not found: $makeappx (请先下载 Windows SDK BuildTools nuget 包并解压到 $sdkDir)" }
if (!(Test-Path $signtool)) { throw "signtool not found: $signtool" }
if (!(Test-Path $cert)) { throw "证书不存在: $cert (请先运行 New-SelfSignedCertificate 生成)" }

Write-Host '[1/4] Building win-unpacked...'
Push-Location $root
npx electron-builder --win dir --x64
if ($LASTEXITCODE -ne 0) { throw 'electron-builder dir failed' }
Pop-Location

Write-Host '[2/4] Staging to ASCII temp path (避免中文路径干扰签名工具)...'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
Copy-Item (Join-Path $dist 'win-unpacked\*') $tmp -Recurse -Force
Copy-Item (Join-Path $root 'build\appx\AppxManifest.xml') (Join-Path $tmp 'AppxManifest.xml') -Force
New-Item -ItemType Directory -Path (Join-Path $tmp 'Assets') -Force | Out-Null
Copy-Item (Join-Path $root 'build\appx\Assets\*') (Join-Path $tmp 'Assets\') -Force

Write-Host '[3/4] makeappx pack (MSIX)...'
& $makeappx pack /d $tmp /p (Join-Path $tmp 'package.msix') /o
if ($LASTEXITCODE -ne 0) { throw 'makeappx failed' }

Write-Host '[4/4] signtool sign...'
& $signtool sign /tr http://timestamp.digicert.com /f $cert /fd sha256 /td sha256 /d 'Wanshuang Launcher' /p $certPwd (Join-Path $tmp 'package.msix')
if ($LASTEXITCODE -ne 0) { throw 'signtool failed' }

$out = Join-Path $dist 'Wanshuang Launcher 1.2.0.msix'
Copy-Item (Join-Path $tmp 'package.msix') $out -Force
Write-Host "Done: $out"
