import { MongoClient } from 'mongodb';
import { createMockMongoClient } from './mongodbMock.js';

let mongoClient: any;
let db: any;
let initPromise: Promise<void> | null = null;

/**
 * Initializes MongoDB connection.
 */
export async function initMongo(force = false) {
  if (initPromise && !force && db) return db;
  
  if (force && mongoClient) {
    try {
      await mongoClient.close();
    } catch (e) {
      console.warn('[MongoDB] Error closing before reconnect:', e);
    }
    mongoClient = null;
    db = null;
    initPromise = null;
  }

  if (!initPromise) {
    initPromise = (async () => {
      console.log('[MongoDB] Starting initialization...');
      
      const useMock = process.env.VITE_USE_MOCK_MONGO === 'true' || 
                      (typeof (import.meta as any).env !== 'undefined' && (import.meta as any).env?.VITE_USE_MOCK_MONGO === 'true');

      if (useMock) {
        console.warn('[MongoDB] Using Mock Service!');
        const mock = createMockMongoClient();
        mongoClient = mock;
        db = mock.db();
        return;
      }

      const mongoUri = process.env.MONGODB_URI || '';
      console.log('[MongoDB] URI check:', mongoUri ? `Set (Length: ${mongoUri.length})` : 'MISSING');

      if (!mongoUri || mongoUri.includes('your-mongo') || mongoUri.length < 10) {
        console.warn('[MongoDB] URI missing or placeholder, falling back to mock.');
        const mock = createMockMongoClient();
        mongoClient = mock;
        db = mock.db();
        return;
      }

      const maskedUri = mongoUri.replace(/\/\/.*:.*@/, '//****:****@');
      console.log(`[MongoDB] Attempting to connect to: ${maskedUri}`);

      if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
        console.error('[MongoDB] Invalid URI protocol');
        throw new Error(`Invalid MongoDB URI protocol`);
      }

      try {
        console.log('[MongoDB] Initializing MongoClient...');
        mongoClient = new MongoClient(mongoUri, {
          connectTimeoutMS: 5000, 
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 10000,
        });
        
        console.log('[MongoDB] Calling .connect()...');
        await mongoClient.connect();
        console.log('[MongoDB] .connect() successful');
        
        // Determine DB name
        let dbName = 'myroad_vite';
        try {
          const url = new URL(mongoUri);
          const pathDbName = url.pathname.slice(1);
          if (pathDbName) {
            dbName = pathDbName;
          }
        } catch (e) {
          // Not a valid URL or other parsing error
        }
        
        // Use test database if in test environment
        if ((process.env.NODE_ENV === 'test' || process.env.VITEST) && !dbName.endsWith('_test')) {
          dbName = `${dbName}_test`;
        }

        db = mongoClient.db(dbName);
        console.log(`[MongoDB] Connected to database: ${dbName}`);
      } catch (error: any) {
        console.error('[MongoDB] Connection failed, falling back to mock:', error.message);
        const mock = createMockMongoClient();
        mongoClient = mock;
        db = mock.db();
      }
    })();
  }

  await initPromise;
  return db;
}

export const mongodb = {
  get db() {
    return db;
  },
  connect: (force = false) => initMongo(force),
  close: async () => {
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
      db = null;
      initPromise = null;
    }
  }
};
