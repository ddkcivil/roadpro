import { mongodb } from '../lib/mongodb.js';
import { hashPassword } from '../api/_utils/mongoAuth.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.vercel') });

async function seed() {
  console.log('🚀 Seeding admin user to MongoDB...');

  try {
    const db = await mongodb.connect();
    if (!db) {
       throw new Error('Could not connect to database');
    }
    
    const email = 'admin@myroad.app';
    const password = 'admin123';
    
    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    
    const hashedPassword = await hashPassword(password);
    const adminData = {
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      full_name: 'Admin User',
      role: 'ADMIN',
      avatar_url: `https://ui-avatars.com/api/?name=Admin&background=6366f1`,
      last_seen: new Date().toISOString(),
      phone: '',
      created_at: new Date().toISOString()
    };

    if (existingUser) {
      console.log(`User ${email} already exists. Updating password...`);
      await db.collection('users').updateOne(
        { _id: existingUser._id },
        { $set: { passwordHash: hashedPassword, role: 'ADMIN' } }
      );
      console.log('✅ Admin user updated.');
    } else {
      const newUser = {
        _id: 'admin-1', // Fixed ID for admin
        ...adminData
      };
      await db.collection('users').insertOne(newUser);
      console.log('✅ Admin user created.');
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    try {
      await mongodb.close();
    } catch (e) {}
    process.exit(0);
  }
}

seed();
