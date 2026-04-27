@echo off
setlocal

:: ==============================================
::   PWA Storefront - Manual Runner (Windows)
:: ==============================================

:: Set project paths
set "PROJECT_ROOT=C:\Users\bhard\Desktop\CU\Full_Stack\workspace\HTML-LAB\Experiment-10(Project)\pwa-storefront-fixed"
set "API_DIR=%PROJECT_ROOT%\api"
set "WEB_DIR=%PROJECT_ROOT%\web"

echo ==================================================
echo       Starting PWA Storefront (Manual Run)
echo ==================================================
echo Project Root: %PROJECT_ROOT%
echo.

:: Step 1 - Seed the database
echo [1/4] Seeding MongoDB with demo data...
cd /d "%API_DIR%"
node seed.js
if %errorlevel% neq 0 (
    echo ⚠️  Warning: Seeding may have failed. Check MongoDB connection.
) else (
    echo ✅ Database seeding complete.
)
echo.

:: Step 2 - Start backend (API)
echo [2/4] Starting API server...
start "PWA API Server" powershell -NoExit -Command "cd '%API_DIR%'; npm install; npm run dev"
echo API should start on http://localhost:4000/
echo.

:: Step 3 - Start frontend (React Web)
echo [3/4] Starting frontend (React + Vite)...
start "PWA Web Frontend" powershell -NoExit -Command "cd '%WEB_DIR%'; npm install; npm run dev"
echo Frontend will be available at http://localhost:5173/
echo.

:: Step 4 - Summary
echo [4/4] All services launched successfully!
echo --------------------------------------------------
echo 🌐 Visit App: http://localhost:5173/
echo 🛠️  API:       http://localhost:4000/api/products
echo --------------------------------------------------
echo Press any key to exit this window (servers keep running)...
pause >nul

endlocal
exit /b
