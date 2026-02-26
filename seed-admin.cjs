// seed-admin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/roadpro';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const adminEmail = 'admin@roadmaster.pro';
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      console.log('Admin user already exists.');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const admin = new User({
      id: 'admin-001',
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN'
    });

    await admin.save();
    console.log('-----------------------------------');
    console.log('Admin user created successfully!');
    console.log(`Email: ${adminEmail}`);
    console.log('Password: Admin123!');
    console.log('-----------------------------------');
    console.log('Please change this password after your first login.');

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
