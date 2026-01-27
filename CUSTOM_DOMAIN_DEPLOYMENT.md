# RoadPro Custom Domain Deployment Guide

## 🎯 Goal
Deploy RoadPro application to your custom domain: rajendradhakal.com.np

## 🏗️ Architecture Options

### Option 1: Vercel Frontend + Custom Domain + Railway Backend
- **Frontend**: Vercel with custom domain rajendradhakal.com.np
- **Backend**: Railway API (keeps existing MongoDB integration)
- **Benefits**: Professional domain + reliable backend

### Option 2: Full Custom Deployment
- **Frontend**: Deploy to your own hosting with custom domain
- **Backend**: Railway or your own server
- **More complex but full control**

## 🚀 Recommended Approach: Vercel + Custom Domain

### Step 1: Configure Vercel Custom Domain

1. **Access Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Find your RoadPro project

2. **Add Domain**
   - Go to Settings → Domains
   - Add domains:
     - `rajendradhakal.com.np`
     - `www.rajendradhakal.com.np`

3. **DNS Configuration**
   - In your domain registrar's DNS settings, add:
   
   **For www subdomain:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: Auto
   ```

   **For apex domain (optional):**
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

### Step 2: Keep Railway Backend
Your Railway backend API remains the same:
- URL: `https://your-railway-app.up.railway.app`
- MongoDB integration stays intact

### Step 3: Update Configuration
Update your `services/apiConfig.ts` with the Railway URL:
```typescript
BASE_URL: 'https://your-railway-app.up.railway.app'
```

### Step 4: Test Deployment
1. Wait for DNS propagation (5-30 minutes)
2. Visit `https://rajendradhakal.com.np`
3. Test login and user management features

## 💰 Cost Considerations

- **Vercel**: Free tier sufficient for most use cases
- **Railway**: Free tier with limitations
- **Domain**: Annual cost for rajendradhakal.com.np
- **MongoDB Atlas**: Free M0 tier

## 🛡️ Security Benefits

- Professional appearance
- HTTPS automatically handled by Vercel
- Better branding for users
- Easier to remember URL

## 📋 Timeline

1. **DNS Setup**: 5-30 minutes
2. **Vercel Configuration**: 5 minutes
3. **Propagation Wait**: 5-60 minutes
4. **Testing**: 15 minutes

## 🆘 Troubleshooting

**If domain doesn't resolve:**
- Check DNS records are correct
- Wait for full propagation
- Use `dig` or online DNS checkers

**If SSL issues:**
- Vercel handles SSL automatically
- Check Vercel dashboard for certificate status

**If API connection fails:**
- Verify Railway URL is correct
- Check Railway deployment status
- Test API endpoints directly

## ✅ Success Criteria

- [ ] rajendradhakal.com.np loads the application
- [ ] www.rajendradhakal.com.np redirects properly
- [ ] Login functionality works with real data
- [ ] User management features are operational
- [ ] Data persists across browser sessions

This approach gives you the professional custom domain while maintaining the reliability of Vercel hosting and Railway backend.