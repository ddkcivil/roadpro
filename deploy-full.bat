@echo off
echo 🚀 RoadPro Deployment Automation
echo ================================

echo.
echo 📋 Pre-deployment Checks:
echo =======================

REM Check MongoDB connection
echo 🔍 Testing MongoDB connection...
node test-mongodb.js
if %errorlevel% neq 0 (
    echo ❌ MongoDB connection failed. Cannot proceed with deployment.
    pause
    exit /b 1
)
echo ✅ MongoDB connection verified

REM Check if we're in the right directory
if not exist "api\mongo-api.js" (
    echo ❌ Backend API code not found
    pause
    exit /b 1
)
echo ✅ Backend API code present

if not exist "services\apiConfig.ts" (
    echo ❌ Frontend configuration not found
    pause
    exit /b 1
)
echo ✅ Frontend configuration present

echo.
echo 🎯 Ready for Deployment!
echo ======================

echo.
echo 🚂 Step 1: Deploy Backend to Railway
echo ====================================
echo 1. Go to https://railway.com/dashboard
echo 2. Find your RoadPro project
echo 3. Click "Deploy" or "Redeploy"
echo 4. Wait for deployment to complete (2-5 minutes)
echo.
echo Press any key after completing Railway deployment...
pause >nul

echo.
echo 🔧 Step 2: Verify Railway Environment Variables
echo ===============================================
echo Ensure these variables are set in Railway:
echo - MONGODB_URI = mongodb+srv://dharmadkunwar20_db_user:ddK4560%%40@roadpro.9y3feth.mongodb.net/roadpro?retryWrites=true&w=majority
echo - NODE_ENV = production
echo - PORT = 3001
echo.
echo Press any key after verifying environment variables...
pause >nul

echo.
echo 🔍 Step 3: Test Railway API
echo ===========================
echo Testing Railway backend...
curl -s https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app/api/health | findstr "status.*ok" >nul
if %errorlevel% == 0 (
    echo ✅ Railway API is healthy
) else (
    echo ⚠️  Railway API test failed. May need redeployment.
    echo    Continuing with deployment process...
)

echo.
echo 🌐 Step 4: Deploy Frontend to Vercel
echo ===================================
echo 1. Commit and push changes to GitHub:
echo    git add .
echo    git commit -m "Update MongoDB configuration for deployment"
echo    git push origin main
echo 2. Vercel will auto-deploy
echo.
echo Press any key after pushing changes...
pause >nul

echo.
echo 🎉 Deployment Complete!
echo ======================
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
echo For detailed troubleshooting, see docs/DEPLOYMENT_COMPLETE_CHECKLIST.md
echo.
pause