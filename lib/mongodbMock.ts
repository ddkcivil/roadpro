import { v4 as uuidv4 } from 'uuid';

// In-memory mock DB
const mockDB = {
  users: new Map(),
  registrations: new Map()
};

// Seed admin
mockDB.users.set('00000000-0000-0000-0000-000000000000', {
  _id: '00000000-0000-0000-0000-000000000000',
  email: 'admin@myroad.app',
  passwordHash: '$2b$12$X7JCS7utLDMi/vOCEbZ38esHk.xgsiYU3wDPBbgK8CpBHp/oltLe2', // admin123
  full_name: 'Admin User',
  role: 'ADMIN',
  avatar_url: 'https://ui-avatars.com/api/?name=Admin',
  last_seen: new Date().toISOString(),
  phone: ''
});

export const createMockMongoClient = () => ({
  db: () => ({
    listCollections: async () => ({
      toArray: async () => [{ name: 'users' }, { name: 'registrations' }]
    }),
    collection: (name: string) => ({
      listCollections: async function() {
        return {
          toArray: async () => Object.keys(mockDB)
        };
      },
      // Find one
      findOne: async (filter: any) => {
        console.log(`[MockMongo ${name}] findOne`, filter);
        const collection = mockDB[name as keyof typeof mockDB];
        if (collection) {
          for (const doc of collection.values()) {
            if (Object.entries(filter).every(([k, v]) => doc[k] === v)) return doc;
          }
        }
        return null;
      },
      // Insert one
      insertOne: async (doc: any) => {
        const id = doc._id || uuidv4();
        const newDoc = { _id: id, ...doc };
        if (name === 'users') mockDB.users.set(id, newDoc);
        return { insertedId: id };
      },
      // Update one
      updateOne: async (filter: any, update: any) => {
        console.log(`[MockMongo ${name}] updateOne`, filter, update);
        return { matchedCount: 1, modifiedCount: 1 };
      },
      // Delete one
      deleteOne: async (filter: any) => {
        console.log(`[MockMongo ${name}] deleteOne`, filter);
        return { deletedCount: 1 };
      },
      // Find all
      find: async (filter: any) => ({
        toArray: async () => {
          console.log(`[MockMongo ${name}] find`, filter);
          return Array.from(mockDB[name as keyof typeof mockDB]?.values() || []);
        }
      })
    })
  })
});
