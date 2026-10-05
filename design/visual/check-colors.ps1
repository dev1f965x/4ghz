# Checks the color tokens in tokens.json: WCAG 2.2 contrast for each text and control pair,
# and how far apart the three game accents stay under simulated color vision deficiency.
# Usage: pwsh design/visual/check-colors.ps1   (exits 1 if any check fails)
$ErrorActionPreference = 'Stop'
$tokens = Get-Content -Raw (Join-Path $PSScriptRoot 'tokens.json') | ConvertFrom-Json

function Get-Rgb([string]$hex) {
  $h = $hex.TrimStart('#')
  @([Convert]::ToInt32($h.Substring(0, 2), 16), [Convert]::ToInt32($h.Substring(2, 2), 16), [Convert]::ToInt32($h.Substring(4, 2), 16))
}
function Get-Linear([double]$c) { $c /= 255; if ($c -le 0.04045) { $c / 12.92 } else { [math]::Pow(($c + 0.055) / 1.055, 2.4) } }
function Get-Luminance([string]$hex) {
  $r, $g, $b = (Get-Rgb $hex) | ForEach-Object { Get-Linear $_ }
  0.2126 * $r + 0.7152 * $g + 0.0722 * $b
}
function Get-Contrast([string]$a, [string]$b) {
  $la = Get-Luminance $a; $lb = Get-Luminance $b
  ([math]::Max($la, $lb) + 0.05) / ([math]::Min($la, $lb) + 0.05)
}

# Machado et al. (2009) simulation matrices at severity 1.0, applied in linear RGB.
$cvd = @{
  protanopia   = @(@(0.152286, 1.052583, -0.204868), @(0.114503, 0.786281, 0.099216), @(-0.003882, -0.048116, 1.051998))
  deuteranopia = @(@(0.367322, 0.860646, -0.227968), @(0.280085, 0.672501, 0.047413), @(-0.011820, 0.042940, 0.968881))
  tritanopia   = @(@(1.255528, -0.076749, -0.178779), @(-0.078411, 0.930809, 0.147602), @(0.004733, 0.691367, 0.303900))
}
function Get-Lab([double[]]$lin) {
  $x = (0.4124 * $lin[0] + 0.3576 * $lin[1] + 0.1805 * $lin[2]) / 0.95047
  $y = (0.2126 * $lin[0] + 0.7152 * $lin[1] + 0.0722 * $lin[2])
  $z = (0.0193 * $lin[0] + 0.1192 * $lin[1] + 0.9505 * $lin[2]) / 1.08883
  $f = { param($t) if ($t -gt 0.008856) { [math]::Pow($t, 1 / 3) } else { 7.787 * $t + 16 / 116 } }
  $fx = & $f $x; $fy = & $f $y; $fz = & $f $z
  @((116 * $fy - 16), (500 * ($fx - $fy)), (200 * ($fy - $fz)))
}
function Get-SimLab([string]$hex, $m) {
  $rgb = Get-Rgb $hex
  [double[]]$lin = @((Get-Linear $rgb[0]), (Get-Linear $rgb[1]), (Get-Linear $rgb[2]))
  if ($m) {
    [double[]]$sim = @(0, 0, 0)
    for ($i = 0; $i -lt 3; $i++) {
      $v = $m[$i][0] * $lin[0] + $m[$i][1] * $lin[1] + $m[$i][2] * $lin[2]
      $sim[$i] = [math]::Min(1.0, [math]::Max(0.0, $v))
    }
    $lin = $sim
  }
  Get-Lab $lin
}
function Get-DeltaE($a, $b) { [math]::Sqrt([math]::Pow($a[0] - $b[0], 2) + [math]::Pow($a[1] - $b[1], 2) + [math]::Pow($a[2] - $b[2], 2)) }

$failed = 0
foreach ($theme in 'light', 'dark') {
  $t = $tokens.$theme
  "== $theme"
  # [foreground, background, minimum, label]
  $pairs = @(
    @($t.text, $t.bg, 4.5, 'text on bg'), @($t.text, $t.surface, 4.5, 'text on surface'),
    @($t.muted, $t.bg, 4.5, 'muted on bg'), @($t.muted, $t.surface, 4.5, 'muted on surface'),
    @($t.control, $t.surface, 3.0, 'control border on surface')
  )
  foreach ($g in 'genshin', 'hsr', 'zzz') {
    $a = $t.accent.$g
    $pairs += , @($a.base, $t.surface, 4.5, "$g accent text on surface")
    $pairs += , @($a.base, $t.bg, 3.0, "$g accent mark on bg")
    $pairs += , @($a.on, $a.base, 4.5, "$g text on accent fill")
    $pairs += , @($a.text, $a.soft, 4.5, "$g text on soft fill")
  }
  foreach ($p in $pairs) {
    $r = Get-Contrast $p[0] $p[1]
    $ok = $r -ge $p[2]
    if (-not $ok) { $failed++ }
    '{0,-34} {1,6:N2}:1  {2}' -f $p[3], $r, $(if ($ok) { 'ok' } else { "FAIL (needs $($p[2]))" })
  }
  # Accents must stay apart under each simulation. DeltaE 20 is a clear difference at small sizes.
  foreach ($kind in @('normal') + $cvd.Keys) {
    $m = if ($kind -eq 'normal') { $null } else { $cvd[$kind] }
    $labs = @{}; foreach ($g in 'genshin', 'hsr', 'zzz') { $labs[$g] = Get-SimLab $t.accent.$g.base $m }
    foreach ($pair in @(@('genshin', 'hsr'), @('genshin', 'zzz'), @('hsr', 'zzz'))) {
      $d = Get-DeltaE $labs[$pair[0]] $labs[$pair[1]]
      $ok = $d -ge 20
      if (-not $ok) { $failed++ }
      '{0,-34} dE {1,5:N1}  {2}' -f "$kind $($pair[0])/$($pair[1])", $d, $(if ($ok) { 'ok' } else { 'FAIL (needs 20)' })
    }
  }
}
if ($failed) { "$failed check(s) failed"; exit 1 }
'All checks passed'
