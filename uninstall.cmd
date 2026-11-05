@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%~dp0"

echo ============================================
echo   SMod - restore original shortcuts
echo ============================================
echo.

where node >nul 2>nul
if not errorlevel 1 (
  node "%ROOT%bin\smod.mjs" uninstall
  goto :done
)

set "APPDIR="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\find-app.ps1"`) do (
  if not defined APPDIR set "APPDIR=%%i"
)

if not defined APPDIR (
  echo [ERROR] SPlayer-Next not found. Nothing to restore.
  goto :fail
)

set "ELECTRON_RUN_AS_NODE=1"
"%APPDIR%\SPlayer-Next.exe" "%ROOT%bin\smod.mjs" uninstall

:done
echo.
pause
exit /b 0

:fail
echo.
pause
exit /b 1
