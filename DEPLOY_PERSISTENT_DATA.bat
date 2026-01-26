@echo off
echo 🚀 RoadPro API Deployment Script
echo ================================

echo.
echo Step 1: Setting up MongoDB Atlas
echo --------------------------------
echo 1. Visit: https://www.mongodb.com/atlas
echo 2. Create free account and project
echo 3. Create M0 Sandbox cluster
echo 4. Create database user with read/write permissions
echo 5. Add network access: 0.0.0.0/0
echo 6. Get connection string from 'Connect' button

echo.
echo Step 2: Deploying to Railway
echo ---------------------------
echo 1. Visit: https://railway.app
echo 2. Sign up with GitHub
echo 3. Create new project from your RoadPro repository
echo 4. Set these environment variables in Railway:
echo    MONGODB_URI=your_mongodb_connection_string
echo    NODE_ENV=production
echo    PORT=3001

echo.
echo Step 3: Update Frontend Configuration
echo -----------------------------------
echo 1. Get your Railway API URL
echo 2. Update services/apiService.ts:
echo    this.baseUrl = 'your-railway-url-here'

echo.
echo Step 4: Deploy Frontend Updates
echo ------------------------------
echo 1. Commit and push changes to GitHub
echo 2. Vercel will automatically deploy updates
echo 3. Test the application - data should now persist!

echo.
echo ✅ Deployment Complete!
echo Your RoadPro application will now use persistent MongoDB storage.

pause