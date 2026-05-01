import 'dotenv/config';
import { mongodb } from './lib/mongodb.js';

async function listRegistrations() {
  console.log('--- MongoDB Pending Registrations ---');
  try {
    const registrations = await mongodb.db.collection('registrations')
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    console.log(JSON.stringify(registrations, null, 2));
    console.log(`Total pending: ${registrations.length}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

listRegistrations();
