@echo off
echo 🚀 RoadPro Deployment Assistant
echo ================================

echo.
echo 🎯 Current Status Check:
echo =====================

REM Check if MongoDB password is configured
findstr /C:"YOUR_PASSWORD" api\.env >nul
if %errorlevel% == 0 (
    echo ❌ MongoDB password not configured in api/.env
    echo    Please update the MONGODB_URI with your actual password
    goto :mongodb_setup
) else (
    echo ✅ MongoDB password configured
)

REM Check if Railway is accessible
echo Checking Railway backend status...
curl -s https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health | findstr "status.*ok" >nul
if %errorlevel% == 0 (
    echo ✅ Railway backend is healthy
) else (
    echo ❌ Railway backend needs redeployment
    goto :railway_deploy
)

echo.
echo 🎉 Deployment appears to be successful!
echo ======================================
echo Visit your application at: https://roadpro-weld.vercel.app
echo Backend API status: https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health

goto :end

:mongodb_setup
echo.
echo 🛠️  MongoDB Atlas Setup Required
echo ================================
echo 1. Go to https://cloud.mongodb.com
echo 2. Verify your cluster is running
echo 3. Check database user dharmadkunwar20_db_user exists
echo 4. Ensure your IP is whitelisted in Network Access
echo 5. Update api/.env with your actual MongoDB password
echo.
echo Press any key to continue after completing MongoDB setup...
pause >nul
goto :check_status

:railway_deploy
echo.
echo 🚂 Railway Redeployment Required
echo ================================
echo 1. Go to https://railway.com/dashboard
echo 2. Find your RoadPro project
echo 3. Click "Deploy" or "Redeploy"
echo 4. Wait for deployment to complete
echo 5. Update services/apiConfig.ts with new Railway URL if changed
echo.
echo Press any key to continue after redeployment...
pause >nul
goto :check_status

:check_status
echo.
echo 🔄 Checking deployment status...
goto :start

:end
echo.
echo 🎯 Next Steps:
echo =============
echo 1. Test your application at https://roadpro-weld.vercel.app
echo 2. Create a test user account
echo 3. Verify data persistence
echo 4. Test admin functionality
echo.
echo For detailed deployment instructions, see:
echo - docs/DEPLOYMENT_COMPLETE_CHECKLIST.md
echo - docs/BLOB_URL_EXPIRATION.md (for document handling)
echo.
pause