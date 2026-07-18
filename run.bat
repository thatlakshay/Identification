@echo off
title IDENTITIFICATION Server Console
echo ==============================================
echo  IDENTITIFICATION CONSOLE — LOCAL SERVER UTILITY
echo ==============================================
echo.

:: Check Node.js / npx
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Node.js is installed. Starting http-server on port 8080...
    echo [INFO] Opening http://localhost:8080/ in browser...
    start "" "http://localhost:8080/"
    npx -y http-server -p 8080
    goto end
)

:: Check Python
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Python is installed. Starting http.server on port 8000...
    echo [INFO] Opening http://localhost:8000/ in browser...
    start "" "http://localhost:8000/"
    python -m http.server 8000
    goto end
)

echo [ERROR] Neither Node.js nor Python was found in your PATH.
echo [ERROR] You can run index.html directly by double-clicking it, 
echo [ERROR] or install Node.js/Python to run a local server environment.
echo.
pause

:end
