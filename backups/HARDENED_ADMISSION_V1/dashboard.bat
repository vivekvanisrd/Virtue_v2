@echo off
setlocal enabledelayedexpansion
title Virtue V2 Advanced Developer Hub
color 0B

:: Check for Next.js folder to ensure we're in the right place
if not exist "package.json" (
    color 0C
    echo [ERROR] Must be run from the Virtue V2 project root.
    pause
    exit /b
)

:: Argument Handling (Used by Native GUI Interface)
if "%1"=="1" goto dev_all
if "%1"=="2" goto safe_sync
if "%1"=="3" goto nuclear
if "%1"=="4" goto db

:menu
cls
echo ==============================================================================
echo                      VIRTUE V2 - ADVANCED DEVELOPER HUB
echo ==============================================================================
echo.
echo   [1] Start Full Environment (Next.js Dev Server + Prisma Studio)
echo   [2] Safe Git Auto-Sync     (Runs Lint ^& Type-Check before Push)
echo   [3] The Nuclear Reset      (Kills Port 3000, Clears Cache, Re-Generates)
echo   [4] Database Migrations    (Run Prisma DB Push)
echo   [5] Exit
echo.
echo ==============================================================================
choice /c 12345 /n /m "Select an option [1-5]: "

if errorlevel 5 goto eof
if errorlevel 4 goto db
if errorlevel 3 goto nuclear
if errorlevel 2 goto safe_sync
if errorlevel 1 goto dev_all

:dev_all
cls
echo Starting Next.js Dev Server and Prisma Studio concurrently...
echo Press Ctrl+C to terminate both services...
call npx --yes concurrently -c "blue,green" -n "NEXT,PRISMA" "npm run dev" "npx prisma studio"
pause
goto menu

:safe_sync
cls
echo ==============================================================================
echo                           SAFE GIT AUTO-SYNC
echo ==============================================================================
echo [1/4] Running Code Linter (ESLint)...
call npm run lint
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Linter found issues. Sync aborted to protect deployment.
    pause
    color 0B
    goto menu
)

echo [2/4] Running TypeScript Type-Checker...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] TypeScript compilation failed. Sync aborted to protect deployment.
    pause
    color 0B
    goto menu
)

echo [3/4] Adding changes to Git...
git add .
set /p msg="Enter commit message (Leave blank for 'auto-sync'): "
if "!msg!"=="" set msg=auto-sync: type-checked and linted successfully
git commit -m "!msg!"

echo [4/4] Pushing to repository...
git push
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Git push failed. Please check your connection or remote status.
    pause
    color 0B
    goto menu
)

color 0A
echo.
echo [SUCCESS] Code safely synced and pushed to Vercel!
pause
color 0B
goto menu

:nuclear
cls
echo ==============================================================================
echo                             NUCLEAR RESET
echo ==============================================================================
echo WARNING: This will kill any process on Port 3000 and clear Next.js caches.
echo.
pause
echo.
echo [1/3] Hunting for Ghost Processes on Port 3000...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
    if not "%%T"=="0" (
        echo Killing process PID: %%T...
        taskkill /pid %%T /F 2>nul
    )
)
echo [2/3] Clearing Next.js cache (.next folder)...
if exist ".next" rmdir /s /q ".next"
echo [3/3] Re-generating Prisma Client...
call npx prisma generate
echo.
color 0A
echo [SUCCESS] Environment reset to a pristine state.
pause
color 0B
goto menu

:db
cls
echo ==============================================================================
echo                           PRISMA DATABASE SYNC
echo ==============================================================================
echo Pushing schema changes to the database...
call npx prisma db push
pause
goto menu

:eof
color 07
cls
exit /b
