# 🚀 RoadPro Deployment Checklist

## Phase 1: MongoDB Atlas Setup
- [ ] Create MongoDB Atlas account at mongodb.com/atlas
- [ ] Create new project named "RoadPro"
- [ ] Create M0 Sandbox cluster (free tier)
- [ ] Create database user with username/password
- [ ] Add network access: 0.0.0.0/0
- [ ] Copy MongoDB connection string

## Phase 2: Railway Backend Deployment
- [ ] Create Railway account at railway.app
- [ ] Connect GitHub repository
- [ ] Deploy RoadPro API from GitHub
- [ ] Set environment variables in Railway:
  - [ ] `MONGODB_URI` = your MongoDB connection string
  - [ ] `NODE_ENV` = production
  - [ ] `PORT` = 3001
- [ ] Copy your Railway API URL

## Phase 3: Frontend Configuration Update
- [ ] Update `services/apiConfig.ts`:
  - [ ] Replace `BASE_URL` with your Railway URL
- [ ] Commit and push changes to GitHub
- [ ] Wait for Vercel auto-deployment

## Phase 4: Testing
- [ ] Visit your deployed application
- [ ] Test user registration
- [ ] Verify data persists after browser refresh
- [ ] Test admin approval workflow
- [ ] Confirm cross-browser data access

## Success Criteria
- [ ] User registrations save to database
- [ ] Data persists across browser sessions
- [ ] Admin can approve/reject registrations
- [ ] Projects save and load correctly
- [ ] Application works from multiple browsers/devices

## Troubleshooting
If data still shows as mock:
- Check browser console for API connection errors
- Verify Railway API URL is correct
- Confirm MongoDB connection string is valid
- Check Railway logs for deployment issues

## Estimated Time: 15-30 minutes
Most of the time is waiting for MongoDB cluster provisioning and Railway deployment.