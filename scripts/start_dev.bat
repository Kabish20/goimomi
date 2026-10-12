@echo off
cd /d "%~dp0\.."
echo ===================================================
echo   Goimomi Holidays - Local Development Launcher
echo ===================================================
echo.
echo Launching Django Backend on http://127.0.0.1:8000 ...
start "Goimomi Backend" cmd /k "cd goimomibackend && python manage.py runserver 0.0.0.0:8000"

echo Launching React Frontend on http://localhost:5174 ...
start "Goimomi Frontend" cmd /k "cd goimomifrontend && npm run dev"

echo.
echo All services are starting up!
echo - Frontend: http://localhost:5174
echo - Django Backend API: http://127.0.0.1:8000
echo.
