$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BlenderPath = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
$SiteMaster = Join-Path $PSScriptRoot 'assets\tgdevs_site_experience_r1.blend'
if (-not (Test-Path -LiteralPath $BlenderPath)) { throw "Blender not found: $BlenderPath" }
if (-not (Test-Path -LiteralPath $SiteMaster)) { throw "Blender site master not found: $SiteMaster" }
Push-Location $ProjectRoot
try {
  & $BlenderPath --background $SiteMaster --python blender\export_site_artifacts.py
  if ($LASTEXITCODE -ne 0) { throw 'Blender site artifact export failed.' }
}
finally {
  Pop-Location
}
