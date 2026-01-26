// API Health Check Script
// Run this after deployment to verify everything is working

async function checkApiHealth() {
  const API_URL = 'YOUR_RAILWAY_API_URL_HERE'; // Update this with your actual URL
  
  console.log('🔍 Checking API Health...\n');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch(`${API_URL}/api/health`);
    const healthData = await healthResponse.json();
    
    console.log('✅ API Health Check:');
    console.log(`   Status: ${healthData.status}`);
    console.log(`   Database: ${healthData.database}`);
    console.log(`   Timestamp: ${healthData.timestamp}\n`);
    
    // Test user endpoint
    const usersResponse = await fetch(`${API_URL}/api/users`);
    const usersData = await usersResponse.json();
    
    console.log('✅ Users Endpoint:');
    console.log(`   Users count: ${usersData.length}`);
    console.log(`   Status: ${usersResponse.status}\n`);
    
    // Test pending registrations endpoint
    const pendingResponse = await fetch(`${API_URL}/api/pending-registrations`);
    const pendingData = await pendingResponse.json();
    
    console.log('✅ Pending Registrations:');
    console.log(`   Pending count: ${pendingData.length}`);
    console.log(`   Status: ${pendingResponse.status}\n`);
    
    console.log('🎉 All API endpoints are working correctly!');
    console.log('Your RoadPro application should now use persistent data.');
    
  } catch (error) {
    console.error('❌ API Health Check Failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\nTroubleshooting steps:');
    console.error('1. Verify your Railway API URL is correct');
    console.error('2. Check if Railway deployment completed successfully');
    console.error('3. Verify MongoDB Atlas connection string');
    console.error('4. Check Railway logs for errors');
  }
}

// Run the health check
checkApiHealth();