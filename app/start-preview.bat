@echo off
cd /d "%~dp0"
echo Starting preview server on http://localhost:3000
echo Press Ctrl+C to stop
npx vite preview --port 3000
pause
