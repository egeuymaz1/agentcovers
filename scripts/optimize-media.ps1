$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Covers = Join-Path $Root "covers"
$VideoExtensions = @(".mp4", ".mov", ".webm")
$ImageExtensions = @(".jpg", ".jpeg", ".png", ".webp")
$MaxVideoSize = 640
$MaxImageSize = 900

function Invoke-Checked($Command, $Arguments) {
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Command failed with exit code $LASTEXITCODE"
  }
}

if (!(Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg bulunamadi. Video optimizasyonu icin ffmpeg gerekli."
}

$Videos = Get-ChildItem -Path $Covers -Recurse -File |
  Where-Object { $VideoExtensions -contains $_.Extension.ToLowerInvariant() }

foreach ($Video in $Videos) {
  $Temp = Join-Path $Video.DirectoryName ("." + $Video.BaseName + ".optimized.mp4")
  $Args = @(
    "-y",
    "-i", $Video.FullName,
    "-vf", "scale=${MaxVideoSize}:${MaxVideoSize}:force_original_aspect_ratio=increase,crop=${MaxVideoSize}:${MaxVideoSize}",
    "-an",
    "-r", "24",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "32",
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    $Temp
  )
  Invoke-Checked "ffmpeg" $Args
  Remove-Item -LiteralPath $Video.FullName -Force
  Move-Item -LiteralPath $Temp -Destination $Video.FullName -Force
}

$Images = Get-ChildItem -Path $Covers -Recurse -File |
  Where-Object { $ImageExtensions -contains $_.Extension.ToLowerInvariant() }

foreach ($Image in $Images) {
  $Temp = Join-Path $Image.DirectoryName ("." + $Image.BaseName + ".optimized" + $Image.Extension)
  $Args = @(
    "-y",
    "-i", $Image.FullName,
    "-vf", "scale=${MaxImageSize}:${MaxImageSize}:force_original_aspect_ratio=decrease",
    "-q:v", "5",
    $Temp
  )
  Invoke-Checked "ffmpeg" $Args
  Remove-Item -LiteralPath $Image.FullName -Force
  Move-Item -LiteralPath $Temp -Destination $Image.FullName -Force
}

Write-Host "Medya optimize edildi: $($Videos.Count) video, $($Images.Count) gorsel"
