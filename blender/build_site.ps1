param([switch]$RebuildSiteMaster)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BlenderPath = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$BlendFile = Join-Path $ProjectRoot 'blender\assets\tgdevs_brands_r2.blend'
$SiteMaster = Join-Path $ProjectRoot 'blender\assets\tgdevs_site_experience_r1.blend'
$AssetsDir = Join-Path $ProjectRoot 'blender\assets'
$TgdevsLogoSource = Join-Path $PSScriptRoot 'sources\tgdevs-logo-current.png'
$TgdevsFaviconSource = Join-Path $PSScriptRoot 'sources\tgdevs-favicon-full-r3.png'
$TgbcFaviconSource = Join-Path $PSScriptRoot 'sources\tgbc-favicon-original.png'
$TgbcFaviconCrop = Join-Path $AssetsDir 'tgbc-favicon-build-crop.png'

if (-not (Test-Path -LiteralPath $BlenderPath)) { throw "Blender not found: $BlenderPath" }
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg is required for image conversion and JPEG export.' }
if (-not (Test-Path -LiteralPath $TgdevsLogoSource)) { throw "TGDevs canonical logo is missing: $TgdevsLogoSource" }
if (-not (Test-Path -LiteralPath $TgdevsFaviconSource)) { throw "TGDevs layered favicon source is missing: $TgdevsFaviconSource" }
if (-not (Test-Path -LiteralPath $TgbcFaviconSource)) { throw "TGBC canonical favicon is missing: $TgbcFaviconSource" }

& ffmpeg -hide_banner -loglevel error -y -i $TgbcFaviconSource -vf 'crop=850:880:195:18,scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos' -frames:v 1 $TgbcFaviconCrop
if ($LASTEXITCODE -ne 0) { throw 'TGBC favicon crop failed.' }

Push-Location $ProjectRoot
try {
  if ($RebuildSiteMaster -or -not (Test-Path -LiteralPath $SiteMaster)) {
    # The brand scene is a transient construction input; only the site master
    # remains as the editable .blend source in this repository.
    & $BlenderPath --background --python blender\build_brand_scene.py
    if ($LASTEXITCODE -ne 0) { throw 'Blender source geometry build failed.' }

    & $BlenderPath --background $BlendFile --python blender\build_site_experience.py
    if ($LASTEXITCODE -ne 0) { throw 'Blender site scene build failed.' }
  }

  & $BlenderPath --background $SiteMaster --python blender\export_site_artifacts.py
  if ($LASTEXITCODE -ne 0) { throw 'Blender site artifact export failed.' }

  & ffmpeg -hide_banner -loglevel error -y -i $TgdevsFaviconSource -vf 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000' -frames:v 1 (Join-Path $AssetsDir 'tgdevs-favicon-r3.png')
  if ($LASTEXITCODE -ne 0) { throw 'Canonical TGDevs favicon PNG creation failed.' }
  & ffmpeg -hide_banner -loglevel error -y -i $TgbcFaviconCrop -vf 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000' -frames:v 1 (Join-Path $AssetsDir 'tgbc-favicon-r2.png')
  if ($LASTEXITCODE -ne 0) { throw 'TGBC favicon PNG creation failed.' }

  & ffmpeg -hide_banner -loglevel error -y -f lavfi -i 'color=c=0x030607:s=1200x630' -i $TgdevsLogoSource -filter_complex '[1:v]scale=1100:-1:flags=lanczos[logo];[0:v][logo]overlay=(W-w)/2:(H-h)/2:format=auto' -frames:v 1 -q:v 2 -pix_fmt yuvj444p (Join-Path $AssetsDir 'tgdevs-og-r2.jpg')
  if ($LASTEXITCODE -ne 0) { throw 'Social preview JPEG optimization failed.' }

  Get-Item (Join-Path $AssetsDir 'tgdevs-favicon-r3.png'), (Join-Path $AssetsDir 'tgbc-favicon-r2.png'), (Join-Path $AssetsDir 'tgdevs-og-r2.jpg') |
    Select-Object Name, Length
}
finally {
  Pop-Location
}
