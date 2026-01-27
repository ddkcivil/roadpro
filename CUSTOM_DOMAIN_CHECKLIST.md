# Rajendradhakal.com.np Deployment Checklist

## 🎯 Direct Custom Domain Deployment for RoadPro

### Phase 1: DNS Configuration ✅
- [ ] Access your domain registrar's DNS management
- [ ] Add CNAME record for www subdomain:
  - Type: CNAME
  - Name: www
  - Value: cname.vercel-dns.com
  - TTL: Auto
- [ ] Add A records for apex domain:
  - Type: A, Name: @, Value: 76.76.21.21
  - Type: A, Name: @, Value: 76.76.21.22
- [ ] Save DNS changes

### Phase 2: Vercel Custom Domain Setup ✅
- [ ] Go to https://vercel.com/dashboard
- [ ] Find RoadPro project
- [ ] Go to Settings → Domains
- [ ] Add domain: rajendradhakal.com.np
- [ ] Add domain: www.rajendradhakal.com.np
- [ ] Wait for Vercel to verify domain ownership

### Phase 3: Railway Backend Deployment ✅
- [ ] Go to https://railway.com/dashboard
- [ ] Create new project from GitHub repository
- [ ] Select RoadPro repository
- [ ] Wait for auto-deployment to complete
- [ ] Copy the generated Railway URL

### Phase 4: Configuration Update ✅
- [ ] Get Railway API URL from deployment
- [ ] Update `services/apiConfig.ts`:
  ```typescript
  BASE_URL: 'https://your-railway-url.up.railway.app'
  ```
- [ ] Commit and push changes to GitHub
- [ ] Wait for Vercel auto-deployment

### Phase 5: Testing and Verification ✅
- [ ] Wait 5-30 minutes for DNS propagation
- [ ] Visit https://rajendradhakal.com.np
- [ ] Test login functionality
- [ ] Test user registration
- [ ] Test admin panel
- [ ] Verify data persistence
- [ ] Test cross-browser access

## 📋 Prerequisites Checklist

### Before Starting:
- [ ] Domain registered (rajendradhakal.com.np)
- [ ] GitHub account with RoadPro repository
- [ ] MongoDB Atlas account with cluster created
- [ ] Vercel account connected to GitHub
- [ ] Railway account connected to GitHub

### Required Information:
- [ ] MongoDB Atlas connection string
- [ ] Domain registrar login credentials
- [ ] GitHub repository URL: https://github.com/ddkcivil/RoadPro

## ⏰ Timeline Expectations

| Phase | Time Required | Notes |
|-------|---------------|-------|
| DNS Configuration | 10-15 minutes | Immediate setup |
| Vercel Domain Setup | 5 minutes | Quick configuration |
| Railway Deployment | 5-10 minutes | Auto-deploys from GitHub |
| DNS Propagation | 5-30 minutes | Variable based on DNS provider |
| Testing | 15-20 minutes | Depends on issues encountered |

**Total Estimated Time: 40-80 minutes**

## ✅ Success Criteria

When complete, you should have:
- [ ] Website accessible at https://rajendradhakal.com.np
- [ ] All application features working
- [ ] User data persisting in MongoDB
- [ ] Login/authentication functional
- [ ] Admin panel accessible
- [ ] Cross-browser data synchronization

## 🆘 Emergency Troubleshooting

**If nothing works after 2 hours:**
1. Check Vercel deployment logs
2. Check Railway deployment status
3. Verify MongoDB Atlas cluster is running
4. Double-check all DNS records
5. Test with temporary Vercel URL first

**Quick Wins:**
- Start with www.rajendradhakal.com.np (often faster)
- Test API endpoints directly in browser
- Check browser console for errors
- Verify environment variables in Railway

This checklist will guide you through deploying RoadPro directly to your custom domain with persistent data storage.