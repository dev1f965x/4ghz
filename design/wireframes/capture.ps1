# Renders every wireframe screen to design/wireframes/out/ with headless Microsoft Edge.
# Usage: pwsh design/wireframes/capture.ps1
$ErrorActionPreference = 'Stop'

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge was not found.' }

$dir = $PSScriptRoot
$out = Join-Path $dir 'out'
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory $out | Out-Null
$url = 'file:///' + ((Join-Path $dir 'index.html') -replace '\\', '/')

# name, query, width, height. Default window 1120 x 760; minimum 720 x 560 (Wireframes W1).
$shots = @(
  @('schedule', 's=schedule', 1120, 760),
  @('schedule-loading', 's=schedule-loading', 1120, 760),
  @('schedule-empty', 's=schedule-empty', 1120, 760),
  @('schedule-error', 's=schedule-error', 1120, 760),
  @('schedule-refreshed', 's=schedule-refreshed', 1120, 760),
  @('schedule-refresh-failed', 's=schedule-refresh-failed', 1120, 760),
  @('schedule-stale', 's=schedule-stale', 1120, 760),
  @('schedule-retired', 's=schedule-retired', 1120, 760),
  @('dropdown', 's=dropdown', 1120, 760),
  @('codes', 's=codes', 1120, 760),
  @('codes-en', 's=codes&lang=en', 1120, 760),
  @('codes-empty', 's=codes-empty', 1120, 760),
  @('codes-error', 's=codes-error', 1120, 760),
  @('calendar', 's=calendar', 1120, 760),
  @('calendar-grace', 's=calendar-grace', 1120, 760),
  @('calendar-gap', 's=calendar-gap', 1120, 760),
  @('calendar-none', 's=calendar-none', 1120, 760),
  @('calendar-notplayed', 's=calendar-notplayed', 1120, 760),
  @('calendar-nodata', 's=calendar-nodata', 1120, 760),
  @('calendar-readonly', 's=calendar-readonly', 1120, 760),
  @('calendar-min', 's=calendar&narrow=1', 720, 560),
  @('calendar-min-en', 's=calendar&narrow=1&lang=en', 720, 560),
  @('calendar-min-full', 's=calendar&narrow=1', 720, 1180),
  @('settings', 's=settings', 1120, 760),
  @('settings-region', 's=settings-region', 1120, 760),
  @('settings-region-unchecked', 's=settings-region-unchecked', 1120, 760),
  @('settings-language', 's=settings-language', 1120, 760),
  @('settings-data', 's=settings-data', 1120, 760),
  @('settings-about', 's=settings-about', 1120, 760)
)

foreach ($s in $shots) {
  $file = Join-Path $out "$($s[0]).png"
  & $edge --headless=new --disable-gpu "--window-size=$($s[2]),$($s[3])" "--screenshot=$file" "$url`?$($s[1])" 2>$null | Out-Null
  if (-not (Test-Path $file)) { throw "Capture failed: $($s[0])" }
}
"Captured $($shots.Count) screens to $out"
