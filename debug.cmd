@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%~dp0"
set "APPDIR=%~1"

echo ============================================
echo   SMod diagnose
echo ============================================
echo.

if not "%APPDIR%"=="" goto :haveapp
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\find-app.ps1"`) do (
  if not defined APPDIR set "APPDIR=%%i"
)
:haveapp
echo App dir: %APPDIR%
echo.

echo --- launcher.log (last 25) ---
if exist "%APPDATA%\SMod\launcher.log" (
  powershell -NoProfile -Command "Get-Content \"$env:APPDATA\SMod\launcher.log\" -Tail 25 -Encoding UTF8"
) else (
  echo [missing] launcher.log
)
echo.

echo --- launcher-stderr.log (last 30) ---
if exist "%APPDATA%\SMod\launcher-stderr.log" (
  powershell -NoProfile -Command "Get-Content \"$env:APPDATA\SMod\launcher-stderr.log\" -Tail 30 -Encoding UTF8"
) else (
  echo [missing] launcher-stderr.log
)
echo.

echo --- app-stderr.log (last 20) ---
if exist "%APPDATA%\SMod\app-stderr.log" (
  powershell -NoProfile -Command "Get-Content \"$env:APPDATA\SMod\app-stderr.log\" -Tail 20"
) else (
  echo [missing] app-stderr.log
)
echo.

echo --- debug port listeners ---
netstat -ano | findstr ":9333 :39333 :49333 :29333 :19333"
echo.
echo --- debug port probe ---
powershell -NoProfile -Command "$ports=9333,39333,49333,29333,19333; foreach($p in $ports){ try { $r=(Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 ('http://127.0.0.1:'+$p+'/json/version')).Content; Write-Output ('port '+$p+' OK  '+$r) } catch { Write-Output ('port '+$p+' no response') } }"
echo.

echo --- running processes ---
tasklist /FI "IMAGENAME eq SPlayer-Next.exe" /NH
echo.

echo --- run injector in foreground ---
if "%APPDIR%"=="" (
  echo No app dir found, skip.
  pause
  exit /b 1
)
set "ELECTRON_RUN_AS_NODE=1"
"%APPDIR%\SPlayer-Next.exe" "%ROOT%bin\smod.mjs" start
echo.
echo exit code: %ERRORLEVEL%
pause
