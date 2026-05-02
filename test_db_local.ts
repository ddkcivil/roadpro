
import { mongodb } from './lib/mongodb.js';

async function test() {
  try {
    console.log('Connecting...');
    const db = await mongodb.connect();
    console.log('Connected. DB is:', !!db);
    console.log('mongodb.db is:', !!mongodb.db);
    
    if (db) {
        const collections = await db.listCollections().toArray();
        console.log('Collections:', collections.map((c: any) => c.name));
    }
  } catch (e: any) {
    console.error('Test failed:', e.message);
  } finally {
    await mongodb.close();
  }
}

test();
