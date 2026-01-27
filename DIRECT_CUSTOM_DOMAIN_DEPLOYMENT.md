# Direct Deployment to rajendradhakal.com.np

## 🎯 Goal
Deploy RoadPro directly to your custom domain with persistent data

## 🏗️ Deployment Architecture
**Frontend**: Vercel with custom domain rajendradhakal.com.np
**Backend**: Railway API (for MongoDB integration)
**Database**: MongoDB Atlas

## 🔧 Step-by-Step Instructions

### Step 1: Configure Custom Domain in Vercel

1. **Access Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Sign in with your GitHub account
   - Find your RoadPro project

2. **Add Custom Domain**
   - Click on your RoadPro project
   - Go to "Settings" tab
   - Click "Domains" in left sidebar
   - Click "Add Domain"
   - Enter: `rajendradhakal.com.np`
   - Click "Add"

3. **Configure DNS Records**
   - In your domain registrar's DNS management:
   
   **For www subdomain:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: Auto
   ```

   **For apex domain (optional but recommended):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: Auto
   
   Type: A
   Name: @
   Value: 76.76.21.22
   TTL: Auto
   ```

### Step 2: Set Up Backend API

1. **Access Railway Dashboard**
   - Go to: https://railway.com/dashboard
   - Sign in with GitHub

2. **Deploy Backend**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your RoadPro repository
   - Railway will auto-detect and deploy

3. **Configure Environment Variables**
   - In Railway project settings:
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   NODE_ENV=production
   PORT=3001
   ```

### Step 3: Update Application Configuration

1. **Get Railway API URL**
   - From Railway dashboard, copy your deployed API URL
   - It will look like: `https://your-app-production.up.railway.app`

2. **Update Frontend Configuration**
   - Edit `services/apiConfig.ts`
   - Replace the BASE_URL with your Railway URL:
   ```typescript
   BASE_URL: 'https://your-railway-app.up.railway.app'
   ```

### Step 4: Deploy and Test

1. **Commit Changes**
   ```bash
   git add services/apiConfig.ts
   git commit -m "Update API configuration for custom domain deployment"
   git push origin main
   ```

2. **Wait for Deployments**
   - Vercel will auto-deploy frontend
   - Railway will auto-deploy backend
   - DNS propagation: 5-30 minutes

3. **Test Your Deployment**
   - Visit: https://rajendradhakal.com.np
   - Test login functionality
   - Verify user management works
   - Check data persistence

## ✅ Success Verification

When deployment is complete, you should see:
- ✅ Website loads at rajendradhakal.com.np
- ✅ Login page accessible
- ✅ User registration works
- ✅ Data saves to MongoDB
- ✅ Admin panel functional

## 🆘 Troubleshooting

**If website doesn't load:**
- Check DNS records are correct
- Wait for full DNS propagation
- Verify Vercel deployment succeeded

**If login doesn't work:**
- Check Railway API URL is correct
- Verify MongoDB connection string
- Check Railway logs for errors

**If data isn't saving:**
- Confirm API endpoints are responding
- Check browser console for errors
- Verify MongoDB Atlas cluster is running

## 📋 Timeline

1. DNS Setup: 10-15 minutes
2. Vercel Configuration: 5 minutes
3. Railway Deployment: 5-10 minutes
4. DNS Propagation: 5-30 minutes
5. Testing: 15 minutes

**Total Time: 40-75 minutes**

This approach gives you your custom domain with professional hosting and persistent data storage.