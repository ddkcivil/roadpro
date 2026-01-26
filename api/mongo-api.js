// MongoDB-based API for RoadPro application
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/roadpro', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: String, required: true },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Pending Registration Schema
const pendingRegistrationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  requestedRole: { type: String, required: true },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Project Schema
const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  code: { type: String },
  location: { type: String },
  contractor: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  client: { type: String },
  engineer: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);
const Project = mongoose.model('Project', projectSchema);

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// User Management
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    const user = new User({
      id: `user-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      phone,
      role: role || 'SITE_ENGINEER',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });
    
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Pending Registrations
app.get('/api/pending-registrations', async (req, res) => {
  try {
    const pending = await PendingRegistration.find({ status: 'pending' });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending registrations' });
  }
});

app.post('/api/pending-registrations', async (req, res) => {
  try {
    const { name, email, phone, requestedRole } = req.body;
    
    // Check if registration already exists
    const existing = await PendingRegistration.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Registration already pending' });
    }
    
    const registration = new PendingRegistration({
      id: `pending-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      phone,
      requestedRole
    });
    
    await registration.save();
    res.status(201).json(registration);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit registration' });
  }
});

app.post('/api/pending-registrations/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await PendingRegistration.findById(id);
    
    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    // Create user from registration
    const user = new User({
      id: `user-${Date.now()}`,
      name: registration.name,
      email: registration.email,
      phone: registration.phone,
      role: registration.requestedRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(registration.name)}&background=random`
    });
    
    await user.save();
    
    // Delete pending registration
    await PendingRegistration.findByIdAndDelete(id);
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve registration' });
  }
});

app.delete('/api/pending-registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await PendingRegistration.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject registration' });
  }
});

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find({});
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const projectData = req.body;
    const project = new Project({
      id: `proj-${Date.now()}`,
      ...projectData,
      updatedAt: new Date()
    });
    
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectData = req.body;
    
    const project = await Project.findByIdAndUpdate(
      id,
      { ...projectData, updatedAt: new Date() },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Project.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`RoadPro API server running on port ${PORT}`);
});

module.exports = app;