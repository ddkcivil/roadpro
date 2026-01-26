# MongoDB API Deployment Guide

## Prerequisites
- Node.js installed
- MongoDB database (local or cloud)
- Free MongoDB Atlas account (recommended for production)

## Local Development Setup

### 1. Install Dependencies
```bash
cd api
npm install
```

### 2. Configure MongoDB
Choose one of these options:

**Option A: Local MongoDB**
- Install MongoDB locally
- Update `api/.env`: `MONGODB_URI=mongodb://localhost:27017/roadpro`

**Option B: MongoDB Atlas (Recommended)**
1. Create free account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get your connection string
4. Update `api/.env`: 
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/roadpro
   ```

### 3. Start the API Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3001`

## Production Deployment Options

### Option 1: Railway (Recommended)
1. Create Railway account
2. Connect your GitHub repository
3. Railway will automatically detect and deploy your API
4. Set environment variables in Railway dashboard:
   - `MONGODB_URI` (your MongoDB connection string)
   - `NODE_ENV=production`

### Option 2: Heroku
```bash
heroku create roadpro-api
heroku config:set MONGODB_URI=your_mongodb_uri_here
git push heroku main
```

### Option 3: Vercel Serverless Functions
Convert the Express API to Vercel serverless functions for seamless integration.

## Testing the API

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Create User
```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"+1234567890","role":"SITE_ENGINEER"}'
```

### Get Users
```bash
curl http://localhost:3001/api/users
```

### Submit Registration
```bash
curl -X POST http://localhost:3001/api/pending-registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","phone":"+1234567890","requestedRole":"PROJECT_MANAGER"}'
```

## Frontend Integration

The frontend automatically detects if the API is available and falls back to mock data if not. No additional configuration needed.

## Environment Variables

Create `api/.env` file:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/roadpro

# Server Configuration  
PORT=3001
NODE_ENV=development

# For production with MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/roadpro?retryWrites=true&w=majority
```

## Security Considerations

- Use environment variables for sensitive data
- Implement authentication middleware for production
- Add rate limiting
- Enable CORS restrictions
- Use HTTPS in production
- Regular database backups

## Troubleshooting

**Connection Issues:**
- Verify MongoDB is running
- Check connection string format
- Ensure firewall allows connections

**API Errors:**
- Check server logs
- Verify environment variables
- Test endpoints with curl/postman

**Frontend Integration:**
- Check browser console for errors
- Verify API URL in `apiService.ts`
- Test API connectivity manually