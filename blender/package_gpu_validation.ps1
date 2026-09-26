$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DistRoot = [IO.Path]::GetFullPath((Join-Path $ProjectRoot 'dist'))
$Stage = [IO.Path]::GetFullPath((Join-Path $DistRoot 'tgdevs-webgpu-validation-r27'))
$Archive = [IO.Path]::GetFullPath((Join-Path $DistRoot 'tgdevs-webgpu-validation-r27.zip'))
if (-not $Stage.StartsWith($DistRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Validation stage escaped the dist directory.' }
if (-not (Test-Path -LiteralPath $DistRoot)) { New-Item -ItemType Directory -Path $DistRoot | Out-Null }
if (Test-Path -LiteralPath $Stage) { Remove-Item -LiteralPath $Stage -Recurse -Force }
if (Test-Path -LiteralPath $Archive) { Remove-Item -LiteralPath $Archive -Force }
New-Item -ItemType Directory -Path $Stage | Out-Null

$Files = @(
  'index.html', 'site-webgpu.js', 'site-webgpu.css',
  'vendor\webgpu\THREE-LICENSE.txt', 'vendor\webgpu\three.core.min.js',
  'vendor\webgpu\three.tsl.min.js', 'vendor\webgpu\three.webgpu.min.js',
  'vendor\webgpu\addons\loaders\DRACOLoader.js', 'vendor\webgpu\addons\loaders\GLTFLoader.js',
  'vendor\webgpu\addons\utils\BufferGeometryUtils.js',
  'vendor\webgpu\draco\draco_wasm_wrapper.js', 'vendor\webgpu\draco\draco_decoder.wasm',
  'blender\assets\tgdevs-favicon-r3.png', 'blender\assets\tgbc-favicon-r2.png',
  'blender\assets\site_artwork_r1.glb', 'blender\assets\site_arc_r1.glb',
  'blender\assets\tgdevsMark-points-r2.bin', 'blender\assets\tgbcMark-points-r2.bin',
  'blender\assets\site_timeline_r1.json', 'blender\assets\site_particles_r1.bin',
  'blender\GPU_VALIDATION_README.md'
)
foreach ($RelativePath in $Files) {
  $Source = Join-Path $ProjectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $Source -PathType Leaf)) { throw "Missing validation dependency: $RelativePath" }
  $Destination = Join-Path $Stage $RelativePath
  $DestinationDirectory = Split-Path -Parent $Destination
  if (-not (Test-Path -LiteralPath $DestinationDirectory)) { New-Item -ItemType Directory -Path $DestinationDirectory -Force | Out-Null }
  Copy-Item -LiteralPath $Source -Destination $Destination
}
Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath $Archive -CompressionLevel Optimal
Get-Item -LiteralPath $Archive | Select-Object FullName, Length
