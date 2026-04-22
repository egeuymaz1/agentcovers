$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Covers = Join-Path $Root "covers"
$Output = Join-Path $Root "manifest.js"
$MediaExtensions = @(".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".mov")
$RootFull = (Resolve-Path $Root).Path.TrimEnd("\", "/")

function Convert-ToTitle([string] $Name) {
  $Text = [System.IO.Path]::GetFileNameWithoutExtension($Name)
  $Text = $Text -replace "[-_]+", " "
  $Text = $Text -replace "\s+", " "
  $Text = $Text.Trim()
  return (Get-Culture).TextInfo.ToTitleCase($Text.ToLower())
}

function Get-MediaScore([string] $Path) {
  $Lower = $Path.ToLowerInvariant()
  $Score = 0
  if ($Lower.Contains("cover")) { $Score += 10 }
  if ($Lower.Contains("preview")) { $Score += 8 }
  if ($Lower.EndsWith(".mp4") -or $Lower.EndsWith(".webm") -or $Lower.EndsWith(".mov")) { $Score += 3 }
  return $Score
}

if (!(Test-Path $Covers)) {
  throw "covers klasoru bulunamadi: $Covers"
}

$Items = Get-ChildItem -Path $Covers -Recurse -File |
  Where-Object { $MediaExtensions -contains $_.Extension.ToLowerInvariant() } |
  ForEach-Object {
    $Relative = $_.FullName.Substring($RootFull.Length + 1).Replace("\", "/")
    $AgentId = $Relative.Split("/")[1]
    [PSCustomObject]@{
      AgentId = $AgentId
      Relative = $Relative
      Score = Get-MediaScore $Relative
    }
  } |
  Group-Object AgentId |
  ForEach-Object {
    $Chosen = $_.Group | Sort-Object -Property @{ Expression = "Score"; Descending = $true }, Relative | Select-Object -First 1
    [PSCustomObject]@{
      id = $_.Name
      title = Convert-ToTitle $_.Name
      file = "./" + $Chosen.Relative
      sourcePath = $Chosen.Relative
    }
  } |
  Sort-Object title

$Json = $Items | ConvertTo-Json -Depth 4
if ($null -eq $Json) { $Json = "[]" }

$Content = "window.POOLSITE_MANIFEST = $Json;`n"
Set-Content -Path $Output -Value $Content -Encoding UTF8
Write-Host "Manifest yazildi: $Output ($($Items.Count) agent)"
