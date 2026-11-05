param([string]$AppDirArg)

# Locate SPlayer-Next without COM: read install state, then parse shortcut targets.
$ErrorActionPreference = "SilentlyContinue"

function Emit($dir) {
  if ($dir -and (Test-Path (Join-Path $dir "SPlayer-Next.exe"))) {
    Write-Output $dir
    exit 0
  }
}

if ($AppDirArg) { Emit $AppDirArg }

$state = Join-Path $env:APPDATA "SMod\install.json"
if (Test-Path $state) {
  try {
    $j = Get-Content $state -Raw | ConvertFrom-Json
    Emit $j.appDir
  } catch {}
}

$known = @(
  "C:\SplayerNext\SPlayer-Next",
  (Join-Path $env:LOCALAPPDATA "Programs\SPlayer-Next"),
  (Join-Path $env:ProgramFiles "SPlayer-Next"),
  "D:\APP\SPlayer-Next"
)
foreach ($k in $known) { Emit $k }

$roots = @(
  (Join-Path $env:USERPROFILE "Desktop"),
  (Join-Path $env:PUBLIC "Desktop"),
  (Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs"),
  (Join-Path $env:ProgramData "Microsoft\Windows\Start Menu\Programs")
)

foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem -Path $root -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $bytes = [IO.File]::ReadAllBytes($_.FullName)
    $text = [Text.Encoding]::ASCII.GetString($bytes)
    $m = [regex]::Match($text, '([A-Za-z]:\\[^\x00]{0,180}?SPlayer-Next\.exe)')
    if ($m.Success) {
      Emit (Split-Path -Parent $m.Groups[1].Value)
    }
  }
}

exit 1
