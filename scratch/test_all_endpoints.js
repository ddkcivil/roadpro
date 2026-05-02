const API_BASE = 'https://roadproj.vercel.app/api';

const endpoints = [
  { path: '/health', method: 'GET' },
  { path: '/projects', method: 'GET' },
  { path: '/users', method: 'GET' },
  { path: '/registrations', method: 'GET' },
  { path: '/messages?projectId=general', method: 'GET' },
  { path: '/audit', method: 'GET' },
  { path: '/roads', method: 'GET' },
];

async function checkAllEndpoints() {
  console.log("Checking all API endpoints for healthy connections...");
  let allHealthy = true;

  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await fetch(`${API_BASE}${ep.path}`, {
        method: ep.method,
      });
      const end = Date.now();

      if (!res.ok) {
        console.log(`❌ [${ep.method}] ${ep.path} -> FAILED: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`   Response: ${text.substring(0, 200)}`);
        allHealthy = false;
      } else {
        console.log(`✅ [${ep.method}] ${ep.path} -> OK (${res.status}) in ${end - start}ms`);
      }
    } catch (e) {
      console.log(`❌ [${ep.method}] ${ep.path} -> CRITICAL ERROR:`, e.message);
      allHealthy = false;
    }
  }

  if (allHealthy) {
    console.log("\n✅ ALL ENDPOINTS HEALTHY: The frontend and backend are communicating with the database perfectly.");
  } else {
    console.log("\n⚠️ WARNING: Some endpoints are returning errors. Please check the logs.");
  }
}

checkAllEndpoints();
