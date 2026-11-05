@echo off
cd /d "%~dp0"
node bin\smod.mjs start
if errorlevel 1 pause
