const testUrls = [
  '/auth?action=login',
  '/auth?action=refresh',
  '/auth/logout',
  '/auth',
  '/projects',
  '/users?id=123',
  '/api/auth/login' // This shouldn't happen based on how endpoint is passed, but good to know
];

function isAuthEndpoint(endpoint: string) {
  return endpoint === '/auth' || endpoint.startsWith('/auth?') || endpoint.startsWith('/auth/');
}

console.log('--- Auth Guard Test ---');
testUrls.forEach(url => {
  console.log(`${url.padEnd(25)}: ${isAuthEndpoint(url) ? '✅ AUTH' : '❌ NOT AUTH'}`);
});
