
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.vercel') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not found in .env.vercel');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected!');

    const db = client.db('myroad_vite');
    const users = db.collection('users');

    const email = 'admin@myroad.app';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    const adminUser = {
      _id: 'admin-1',
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      full_name: 'Admin User',
      role: 'ADMIN',
      avatar_url: 'https://ui-avatars.com/api/?name=Admin&background=6366f1',
      last_seen: new Date().toISOString(),
      phone: '',
      created_at: new Date().toISOString()
    };

    console.log(`Checking if user ${email} exists...`);
    const existing = await users.findOne({ email: email.toLowerCase() });

    if (existing) {
      console.log('User exists. Updating password and role...');
      await users.updateOne(
        { _id: existing._id },
        { $set: { passwordHash: hashedPassword, role: 'ADMIN' } }
      );
      console.log('Successfully updated admin user.');
    } else {
      console.log('User does not exist. Creating...');
      await users.insertOne(adminUser);
      console.log('Successfully created admin user.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

run();
