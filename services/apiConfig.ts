// API Configuration File
// Update this file with your deployed API URL

export const API_CONFIG = {
  // 🚨 UPDATE THIS WITH YOUR RAILWAY DEPLOYMENT URL 🚨
  // After deploying to Railway, replace this with your actual URL
  // Example: 'https://your-app-name-production.up.railway.app'
  BASE_URL: 'https://baa26027-8f6b-42f7-86d2-1bbfbb30fc13.up.railway.app',
  
  // For local development, uncomment the line below:
  // BASE_URL: 'http://localhost:3001',
  
  // Timeout for API requests (milliseconds)
  TIMEOUT: 10000,
  
  // Retry attempts for failed requests
  RETRY_ATTEMPTS: 3
};

// Usage in apiService.ts:
// import { API_CONFIG } from './apiConfig';
// this.baseUrl = API_CONFIG.BASE_URL;