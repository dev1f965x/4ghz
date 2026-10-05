# Renders the wireframes with the visual direction applied, in both themes and for each game accent.
# Usage: pwsh design/visual/capture.ps1   (needs a network connection for the preview fonts)
$ErrorActionPreference = 'Stop'

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge was not found.' }

$out = Join-Path $PSScriptRoot 'out'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory $out | Out-Null
$url = 'file:///' + ((Join-Path $PSScriptRoot '..\wireframes\index.html' | Resolve-Path).Path -replace '\\', '/')

# name, query (visual=1 is added), width, height. g: 0 Genshin Impact, 1 Honkai: Star Rail, 2 Zenless Zone Zero.
$shots = @(
  @('light-genshin-schedule', 's=schedule&theme=light&g=0', 1120, 760),
  @('light-hsr-codes', 's=codes&theme=light&g=1', 1120, 760),
  @('light-zzz-calendar', 's=calendar&theme=light&g=2', 1120, 760),
  @('light-genshin-settings-region', 's=settings-region&theme=light&g=0', 1120, 760),
  @('dark-genshin-calendar', 's=calendar&theme=dark&g=0', 1120, 760),
  @('dark-hsr-schedule-stale', 's=schedule-stale&theme=dark&g=1', 1120, 760),
  @('dark-zzz-codes', 's=codes&theme=dark&g=2', 1120, 760),
  @('dark-hsr-settings', 's=settings&theme=dark&g=1', 1120, 760),
  @('dark-zzz-dropdown', 's=dropdown&theme=dark&g=2', 1120, 760),
  @('dark-genshin-calendar-min-en', 's=calendar&narrow=1&lang=en&theme=dark&g=0', 720, 560)
)

foreach ($s in $shots) {
  $file = Join-Path $out "$($s[0]).png"
  # The virtual time budget lets the web fonts load before the capture.
  & $edge --headless=new --disable-gpu --virtual-time-budget=4000 "--window-size=$($s[2]),$($s[3])" "--screenshot=$file" "$url`?visual=1&$($s[1])" 2>$null | Out-Null
  if (-not (Test-Path $file)) { throw "Capture failed: $($s[0])" }
}
"Captured $($shots.Count) screens to $out"
