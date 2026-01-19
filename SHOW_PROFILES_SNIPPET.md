# How to View Saved Profiles

To see the saved profiles and user data in localStorage, you can use any of these methods:

## Method 1: Open the viewer page
Open the `show_profiles.html` file in your browser to see a nicely formatted view of all saved profiles.

## Method 2: Browser Console Command
Open your browser's developer tools (F12) and run this JavaScript command in the Console tab:

```javascript
// Get users from localStorage
const usersJson = localStorage.getItem('roadmaster-users');

if (usersJson) {
    const users = JSON.parse(usersJson);
    console.log('Saved Users:', users);
    
    if (users.length > 0) {
        console.log(`${users.length} user(s) found:`);
        users.forEach((user, index) => {
            console.log(`--- User ${index + 1} ---`);
            console.log(`ID: ${user.id}`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Phone: ${user.phone}`);
            console.log(`Role: ${user.role}`);
            console.log(`Avatar: ${user.avatar || 'Not set'}`);
            console.log('------------------');
        });
    } else {
        console.log('No users found in localStorage.');
    }
} else {
    console.log('No users found in localStorage.');
}
```

## Method 3: Direct localStorage access
In the browser console, you can also directly access the localStorage item:

```javascript
JSON.parse(localStorage.getItem('roadmaster-users'))
```

## Security Note
Please note that for security reasons, actual passwords are not stored in localStorage. Only public profile information is saved, such as:
- User ID
- Name
- Email
- Phone
- Role
- Avatar URL