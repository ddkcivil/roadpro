// Mock API endpoints for user management
// In a real implementation, this would connect to a database

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// In-memory storage (would be replaced with database in production)
let users = [
  {
    id: 'admin-1',
    name: 'System Administrator',
    email: 'admin@roadpro.com',
    phone: '+1234567890',
    role: 'ADMIN',
    password: 'admin123',
    avatar: 'https://ui-avatars.com/api/?name=System+Administrator&background=random',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-dk-1',
    name: 'Dharma Kunwar',
    email: 'dharmadkunwar20@gmail.com',
    phone: '9779802877286',
    role: 'ADMIN',
    password: 'test123',
    avatar: 'https://ui-avatars.com/api/?name=Dharma+Kunwar&background=random',
    createdAt: new Date().toISOString()
  }
];

let projects = [];
let pendingRegistrations = [];

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// User endpoints
app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const { name, email, phone, role, password } = req.body;
  
  // Check if user already exists
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'User already exists' });
  }
  
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    phone,
    role: role || 'SITE_ENGINEER',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  res.status(201).json(newUser);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Check password (in a real app, you'd verify password hash)
  if (user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Return success response
  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    },
    token: 'mock-jwt-token-' + Date.now()
  });
});

// Pending registrations
app.get('/api/pending-registrations', (req, res) => {
  res.json(pendingRegistrations);
});

app.post('/api/pending-registrations', (req, res) => {
  const { name, email, phone, role } = req.body;
  
  const existingPending = pendingRegistrations.find(r => r.email.toLowerCase() === email.toLowerCase());
  if (existingPending) {
    return res.status(409).json({ error: 'Registration already pending' });
  }
  
  const pendingReg = {
    id: `pending-${Date.now()}`,
    name,
    email,
    phone,
    requestedRole: role,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  pendingRegistrations.push(pendingReg);
  res.status(201).json(pendingReg);
});

app.post('/api/pending-registrations/:id/approve', (req, res) => {
  const { id } = req.params;
  const pendingUser = pendingRegistrations.find(r => r.id === id);
  
  if (!pendingUser) {
    return res.status(404).json({ error: 'Pending registration not found' });
  }
  
  const newUser = {
    id: `user-${Date.now()}`,
    name: pendingUser.name,
    email: pendingUser.email,
    phone: pendingUser.phone,
    role: pendingUser.requestedRole,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(pendingUser.name)}&background=random`,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  pendingRegistrations = pendingRegistrations.filter(r => r.id !== id);
  
  res.json(newUser);
});

app.delete('/api/pending-registrations/:id', (req, res) => {
  const { id } = req.params;
  pendingRegistrations = pendingRegistrations.filter(r => r.id !== id);
  res.status(204).send();
});

// Project endpoints
app.get('/api/projects', (req, res) => {
  res.json(projects);
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: `proj-${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  projects.push(project);
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const index = projects.findIndex(p => p.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  projects[index] = {
    ...projects[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };
  
  res.json(projects[index]);
});

app.delete('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  projects = projects.filter(p => p.id !== id);
  res.status(204).send();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});