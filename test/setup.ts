import { mongodb } from '../lib/mongodb';
import { Collection } from 'mongodb';
import '@testing-library/jest-dom';

// Define test collections to cleanup
const TEST_COLLECTIONS = [
  'projects',
  'users', 
  'roads',
  'alignments',
  'structures',
  'registrations',
  'files',
  'messages',
  'audit'
] as const;

type TestCollection = typeof TEST_COLLECTIONS[number];

/** 
 * MongoDB Test Setup 
 * - Uses test database: myroad_vite_test
 * - Clears test collections before all tests
 * - Call in beforeAll()
 */
export class MongoDBTestSetup {
  static async setup() {
    console.log('[MongoDB Test Setup] Ensuring connection to test DB...');
    
    try {
      // Wait for connection to be ready
      await mongodb.connect();
      
      const db = mongodb.db;
      if (!db) {
        throw new Error('Database instance is null after connection');
      }
      
      console.log('[MongoDB Test Setup] Connected, cleaning collections...');
      
      for (const collName of TEST_COLLECTIONS) {
        try {
          const collection = db.collection(collName);
          const result = await collection.deleteMany({});
          console.log(`[MongoDB Test] Cleared ${collName}: ${result.deletedCount} docs`);
        } catch (error) {
          // Collection might not exist yet, which is fine
          console.log(`[MongoDB Test] Note: Could not clear ${collName} (may not exist)`);
        }
      }
      
      console.log('[MongoDB Test Setup] ✅ Test DB ready');
    } catch (error: any) {
      console.error('[MongoDB Test Setup] ❌ Failed to initialize test DB:', error.message);
      console.error('Make sure MongoDB is running: docker-compose up -d mongodb');
      throw error;
    }
  }
  
  static async teardown() {
    try {
      await mongodb.close();
      console.log('[MongoDB Test] Connection closed');
    } catch (error) {
      console.warn('[MongoDB Test] Teardown error:', error);
    }
  }
}

// Global setup for all test files
beforeAll(async () => {
  await MongoDBTestSetup.setup();
}, 10000);

afterAll(async () => {
  await MongoDBTestSetup.teardown();
});

// Per-file cleanup option
export const clearTestCollection = async (collectionName: TestCollection) => {
  const db = mongodb.db;
  const collection = db.collection(collectionName);
  await collection.deleteMany({});
};
