import 'dotenv/config';
import './lib/mongodb.ts';
import { mongodb } from './lib/mongodb.ts';

console.log('MongoDB module imported and init started');

async function test() {
  try {
    await mongodb.connect();
    const db = mongodb.db;
    const collections = await db.listCollections().toArray();
    console.log('MongoDB collections:', collections.map((c: any) => c.name));
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('MongoDB test failed:', error);
  }
}

test();
