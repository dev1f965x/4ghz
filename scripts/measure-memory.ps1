# Measures idle memory for the Design Doc D5 target (under 200 MB): starts the app, waits, and
# sums the private working set (Task Manager's "Memory" column) of the app process and every
# WebView2 process it started. Run against the test build so an installed copy's data is not used:
#   pnpm app:build:e2e; pwsh -File scripts/measure-memory.ps1 -Minutes 10
param(
  [string]$App = "src-tauri/target/e2e/release/4ghz.exe",
  [double]$Minutes = 10
)
$ErrorActionPreference = "Stop"

function Get-Descendants([int]$ParentId, $All) {
  foreach ($child in $All | Where-Object { $_.ParentProcessId -eq $ParentId }) {
    $child
    Get-Descendants $child.ProcessId $All
  }
}

$process = Start-Process -FilePath (Resolve-Path $App) -PassThru
try {
  Start-Sleep -Seconds ([int]($Minutes * 60))
  $all = Get-CimInstance Win32_Process
  $ids = @($process.Id) + @(Get-Descendants $process.Id $all | ForEach-Object { $_.ProcessId })
  $perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process |
    Where-Object { $ids -contains $_.IDProcess }
  $perf | Sort-Object WorkingSetPrivate -Descending |
    ForEach-Object { "{0,-24} {1,8} {2,8:N1} MB" -f $_.Name, $_.IDProcess, ($_.WorkingSetPrivate / 1MB) }
  $total = ($perf | Measure-Object WorkingSetPrivate -Sum).Sum / 1MB
  "{0} processes, {1:N1} MB private working set after {2} minutes" -f $perf.Count, $total, $Minutes
} finally {
  # Closing the window as a user would lets WebView2 shut down cleanly.
  taskkill /PID $process.Id | Out-Null
}
