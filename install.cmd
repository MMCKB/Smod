@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%~dp0"
set "ARGS="
if not "%~1"=="" set "ARGS=--app "%~1""

echo ============================================
echo   SMod - SPlayer-Next injector installer
echo ============================================
echo.

where node >nul 2>nul
if not errorlevel 1 (
  echo Using system Node.
  node "%ROOT%bin\smod.mjs" install %ARGS%
  goto :done
)

echo Node not found, using the player's built-in Electron runtime.
set "APPDIR="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\find-app.ps1" %~1`) do (
  if not defined APPDIR set "APPDIR=%%i"
)

if not defined APPDIR (
  echo.
  echo [ERROR] SPlayer-Next not found.
  echo Pass the install folder explicitly, e.g.:
  echo     install.cmd "D:\APP\SPlayer-Next"
  goto :fail
)

echo Found: %APPDIR%
set "ELECTRON_RUN_AS_NODE=1"
"%APPDIR%\SPlayer-Next.exe" "%ROOT%bin\smod.mjs" install %ARGS%

:done
echo.
echo Install finished.
echo.
echo SMod runtime: %LOCALAPPDATA%\SMod\runtime
echo You can delete this portable folder now - shortcuts no longer depend on it.
echo To uninstall later run: %LOCALAPPDATA%\SMod\runtime\uninstall.cmd
echo.
echo This window closes in 10 seconds.
timeout /t 10 >nul 2>nul
exit /b 0

:fail
echo.
pause
exit /b 1
