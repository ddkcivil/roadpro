<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RoadPro - Construction Management System

A comprehensive construction project management application with cross-browser data persistence and real-time collaboration features.

## 🚀 Live Demo
**Production URL:** https://roadpro-weld.vercel.app

## ✨ Key Features

- **Cross-Browser Persistence**: Data synchronized across all browsers and devices
- **User Management**: Registration, approval workflow, and role-based access
- **Project Management**: Complete project lifecycle tracking
- **Document Management**: PDF viewing, OCR scanning, and document organization
- **Real-time Collaboration**: Messaging and team coordination
- **Analytics Dashboard**: Project metrics and performance tracking

## 🛠️ Technical Stack

- **Frontend**: React 18, TypeScript, Material-UI
- **Backend**: Node.js/Express with MongoDB
- **Database**: MongoDB (local or MongoDB Atlas)
- **Storage**: MongoDB persistence with localStorage fallback
- **Deployment**: Vercel (Frontend), Railway/Heroku (Backend)
- **PDF Handling**: PDF.js with proper version management
- **OCR**: Integrated document scanning and analysis

## 📱 How to Use

### For Users:
1. Visit [https://roadpro-weld.vercel.app](https://roadpro-weld.vercel.app)
2. Click "Create Account" and fill in your details
3. Submit registration (awaits admin approval)
4. Once approved, access from any device/browser

### For Administrators:
1. Log in to the application
2. Navigate to User Management
3. Review and approve pending registrations
4. Manage users and projects

## 🏗️ Architecture

### Frontend Components:
- **User Registration**: `components/UserRegistration.tsx`
- **User Management**: `components/UserManagement.tsx`  
- **Project Management**: `components/ProjectsList.tsx`
- **Document Hub**: `components/DocumentsModule.tsx`
- **API Service**: `services/apiService.ts`

### Backend API:
- RESTful endpoints with MongoDB persistence
- User and project management with database storage
- Registration approval workflow
- Cross-browser data persistence
- Automatic fallback to mock data when API unavailable

## 🔧 Development Setup

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables in `.env.local`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## 🌐 Deployment

### Frontend (Vercel):
```bash
npm install -g vercel
vercel --prod
```

### Backend API (Railway/Heroku):
See `api/MONGODB_DEPLOYMENT.md` for detailed deployment instructions.

**Quick MongoDB Atlas Setup:**
1. Create free account at https://www.mongodb.com/atlas
2. Create cluster and get connection string
3. Deploy API to Railway/Heroku with MongoDB URI

## 📁 Project Structure

```
├── components/          # React components
├── services/           # API and business logic
├── api/               # Backend API (Node.js/Express)
├── utils/             # Helper functions
├── types/             # TypeScript definitions
└── public/            # Static assets
```

## 🎯 Recent Improvements

- ✅ Fixed PDF.js version mismatch issues
- ✅ Implemented MongoDB-based persistent data storage
- ✅ Added user registration approval workflow
- ✅ Enhanced document preview and OCR capabilities
- ✅ Improved error handling and user experience
- ✅ Optimized build performance and chunking
- ✅ Added automatic API detection with fallback to mock data
- ✅ Implemented cross-browser data persistence

## 📚 Documentation

- `PERSISTENT_DATA_SOLUTION.md` - Cross-browser data architecture
- `api/MONGODB_DEPLOYMENT.md` - MongoDB API deployment guide
- `SQLITE_INTEGRATION_SUMMARY.md` - Database integration details
- `HELP.md` - User guide and troubleshooting

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the MIT License.
