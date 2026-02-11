// Simple test script for API endpoints using built-in fetch (Node 18+)

const baseUrl = 'http://localhost:3000/api';

async function testAPI() {
  console.log('Testing API endpoints...\n');

  try {
    // Test GET pending registrations
    console.log('1. Testing GET /pending-registrations');
    const pendingRes = await fetch(`${baseUrl}/pending-registrations`);
    const pendingData = await pendingRes.json();
    console.log('Status:', pendingRes.status);
    console.log('Data:', pendingData);
    console.log('');

    // Test GET users
    console.log('2. Testing GET /users');
    const usersRes = await fetch(`${baseUrl}/users`);
    const usersData = await usersRes.json();
    console.log('Status:', usersRes.status);
    console.log('Data:', usersData);
    console.log('');

    // Test POST pending registration
    console.log('3. Testing POST /pending-registrations');
    const postPendingRes = await fetch(`${baseUrl}/pending-registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        requestedRole: 'SITE_ENGINEER'
      })
    });
    const postPendingData = await postPendingRes.json();
    console.log('Status:', postPendingRes.status);
    console.log('Data:', postPendingData);
    console.log('');

    // Test GET pending registrations again
    console.log('4. Testing GET /pending-registrations after POST');
    const pendingRes2 = await fetch(`${baseUrl}/pending-registrations`);
    const pendingData2 = await pendingRes2.json();
    console.log('Status:', pendingRes2.status);
    console.log('Data:', pendingData2);

    if (pendingData2.length > 0) {
      const pendingId = pendingData2[0].id;
      console.log(`Found pending registration with ID: ${pendingId}`);

      // Test approve
      console.log('5. Testing POST /pending-registrations/[id]/approve');
      const approveRes = await fetch(`${baseUrl}/pending-registrations/${pendingId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const approveData = await approveRes.json();
      console.log('Status:', approveRes.status);
      console.log('Data:', approveData);
      console.log('');

      // Test GET users after approve
      console.log('6. Testing GET /users after approve');
      const usersRes2 = await fetch(`${baseUrl}/users`);
      const usersData2 = await usersRes2.json();
      console.log('Status:', usersRes2.status);
      console.log('Data:', usersData2);

      if (usersData2.length > 0) {
        const userId = usersData2[0].id;
        console.log(`Found user with ID: ${userId}`);

        // Test login
        console.log('7. Testing POST /auth/login');
        const loginRes = await fetch(`${baseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: approveData.tempPassword
          })
        });
        const loginData = await loginRes.json();
        console.log('Status:', loginRes.status);
        console.log('Data:', loginData);
        console.log('');

        // Test update user
        console.log('8. Testing PUT /users/[id]');
        const updateRes = await fetch(`${baseUrl}/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Test User',
            email: 'test@example.com',
            phone: '0987654321',
            role: 'PROJECT_MANAGER'
          })
        });
        const updateData = await updateRes.json();
        console.log('Status:', updateRes.status);
        console.log('Data:', updateData);
        console.log('');

        // Test delete user
        console.log('9. Testing DELETE /users/[id]');
        const deleteRes = await fetch(`${baseUrl}/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('Status:', deleteRes.status);
        console.log('');
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAPI();
