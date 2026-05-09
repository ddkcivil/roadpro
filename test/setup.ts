import '@testing-library/jest-dom';

// MongoDB is no longer required - project uses Supabase
// Keeping stubs for backward compatibility with legacy tests

/** 
 * MongoDB Test Setup (Deprecated)
 * Now uses Supabase instead of MongoDB.
 * This is kept for backward compatibility.
 */
export class MongoDBTestSetup {
  static async setup() {
    // No-op - Supabase tests don't need MongoDB
    console.log('[MongoDB Test Setup] Skipping (uses Supabase now)');
  }
  
  static async teardown() {
    // No-op
    console.log('[MongoDB Test] Teardown (uses Supabase now)');
  }
}

// Global setup for all test files
beforeAll(async () => {
  await MongoDBTestSetup.setup();
}, 10000);

afterAll(async () => {
  await MongoDBTestSetup.teardown();
});

// Legacy stub - no longer used
export const clearTestCollection = async (_collectionName: string) => {
  // No-op - Supabase handles cleanup internally
  console.log('[clearTestCollection] No-op (uses Supabase)');
};
