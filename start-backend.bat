@echo off
echo Starting Backend Server...
cd /d "%~dp0"
cd apps\backend
echo Current directory: %CD%
call npx ts-node src/server.ts
pause
