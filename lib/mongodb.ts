import { MongoClient } from 'mongodb';
import { createMockMongoClient } from './mongodbMock.js';

const useMock = (import.meta as any).env?.VITE_USE_MOCK_MONGO === 'true' || process.env.VITE_USE_MOCK_MONGO === 'true';

let mongoClient: any;
let db: any;

async function initMongo() {
  if (useMock) {
    console.warn('[MongoDB] Using Mock Service!');
    const mock = createMockMongoClient();
    mongoClient = mock;
    db = mock.db();
    return;
  }

  const mongoUri = process.env.MONGODB_URI || (import.meta as any).env?.VITE_MONGODB_URI || '';

  console.log('[MongoDB] Env Check:', { 
    uriLength: mongoUri?.length, 
    uriStart: mongoUri?.substring(0, 10)
  });

  const isPlaceholder = (val: string | undefined) => !val || val.includes('your-mongo') || val.length < 10;

  if (isPlaceholder(mongoUri)) {
    console.error('CRITICAL: MongoDB URI missing or placeholder.');
    // Dummy client
    mongoClient = {
      db: () => ({
        collection: () => ({
          findOne: async () => ({ data: null, error: null }),
          insertOne: async () => ({ data: null, error: null }),
          // etc...
        })
      })
    };
    db = mongoClient.db('myroad_vite');
    return;
  }

  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    throw new Error(`Invalid MongoDB URI: "${mongoUri}"`);
  }

  mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  db = mongoClient.db('myroad_vite');
}

(async () => {
  await initMongo();
})();

export const mongodb = {
  get db() {
    return db;
  },
  close: () => mongoClient?.close()
};
