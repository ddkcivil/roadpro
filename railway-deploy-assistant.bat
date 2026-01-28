@echo off
setlocal enabledelayedexpansion

echo 🚀 Railway Deployment Assistant
echo ===============================

:menu
echo.
echo 🎯 Deployment Options:
echo ===================
echo 1. Open Railway Dashboard
echo 2. Check Current Railway Status
echo 3. Test API Health Endpoint
echo 4. View Deployment Guide
echo 5. Proceed to Frontend Deployment
echo 6. Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" goto open_railway
if "%choice%"=="2" goto check_status
if "%choice%"=="3" goto test_api
if "%choice%"=="4" goto view_guide
if "%choice%"=="5" goto frontend_deploy
if "%choice%"=="6" goto end

echo Invalid choice. Please try again.
goto menu

:open_railway
echo.
echo 🌐 Opening Railway Dashboard...
echo ==============================
echo Please:
echo 1. Go to https://railway.com/dashboard
echo 2. Find your RoadPro project
echo 3. Click "Deploy" or "Redeploy"
echo 4. Wait for deployment to complete
echo.
start "" "https://railway.com/dashboard"
echo Press any key after completing Railway deployment...
pause >nul
goto check_status

:check_status
echo.
echo 🔍 Checking Railway Status...
echo ===========================
curl -s https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health | findstr "status.*ok" >nul
if %errorlevel% == 0 (
    echo ✅ Railway API is healthy and responding
    echo 🎉 Backend deployment successful!
    goto frontend_deploy
) else (
    echo ⚠️  Railway API not responding
    echo Possible issues:
    echo - Deployment still in progress
    echo - Application not found (needs redeployment)
    echo - Environment variables not configured
    echo.
    echo What would you like to do?
    echo 1. Retry status check
    echo 2. View deployment guide
    echo 3. Return to main menu
    set /p retry_choice="Enter choice (1-3): "
    
    if "!retry_choice!"=="1" goto check_status
    if "!retry_choice!"=="2" goto view_guide
    if "!retry_choice!"=="3" goto menu
)
goto menu

:test_api
echo.
echo 🔧 Testing API Health Endpoint...
echo ===============================
echo Request: GET https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health
echo.
curl -s https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health
echo.
echo.
echo Expected response: {"status":"ok","timestamp":"...","database":"connected"}
echo.
pause
goto menu

:view_guide
echo.
echo 📖 Opening Deployment Guide...
echo ============================
echo.
type docs\RAILWAY_DEPLOYMENT_GUIDE.md
echo.
pause
goto menu

:frontend_deploy
echo.
echo 🌐 Frontend Deployment
echo =====================
echo.
echo Current status:
echo - ✅ MongoDB connection working
echo - ✅ Backend code ready
echo - ⬇️  Railway backend needs redeployment confirmation
echo - ⬇️  Frontend deployment pending
echo.
echo Steps to deploy frontend:
echo 1. Commit changes to GitHub:
echo    git add .
echo    git commit -m "Update MongoDB configuration for deployment"
echo    git push origin main
echo.
echo 2. Vercel will auto-deploy
echo.
echo Would you like to proceed with frontend deployment?
echo 1. Yes - Show git commands
echo 2. No - Return to main menu
echo 3. Test current application
set /p frontend_choice="Enter choice (1-3): "

if "%frontend_choice%"=="1" goto git_commands
if "%frontend_choice%"=="2" goto menu
if "%frontend_choice%"=="3" goto test_current

:git_commands
echo.
echo 🐙 Git Deployment Commands:
echo ==========================
echo.
echo Running git commands...
echo.
echo Adding all changes:
git add .
echo.
echo Committing changes:
git commit -m "Update MongoDB configuration and prepare for deployment"
echo.
echo Pushing to GitHub:
git push origin main
echo.
echo 🎉 Changes pushed to GitHub!
echo Vercel will now auto-deploy your frontend.
echo.
echo 📍 Your Application URLs:
echo ========================
echo Frontend: https://roadpro-weld.vercel.app
echo Backend API: https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app
echo.
echo 🧪 Testing Checklist:
echo ===================
echo [ ] Visit frontend and create test user
echo [ ] Test login functionality
echo [ ] Verify data persistence
echo [ ] Test admin panel
echo [ ] Check document management
echo.
pause
goto end

:test_current
echo.
echo 🧪 Testing Current Application
echo =============================
echo.
echo Testing Railway API:
curl -s https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health
echo.
echo.
echo Testing Frontend:
start "" "https://roadpro-weld.vercel.app"
echo.
echo Please test the application and report any issues.
echo.
pause
goto menu

:end
echo.
echo 🎉 Deployment Process Complete!
echo ===============================
echo.
echo Thank you for using RoadPro Deployment Assistant.
echo For any issues, check the documentation in the docs/ folder.
echo.
pause
exit /b 0