import { v4 as uuidv4 } from 'uuid';

// Mock Supabase client implementation
export const createMockSupabaseClient = () => ({
  auth: {
    signInWithPassword: async ({ email, password }: any) => {
      console.log(`[MockAuth] Login attempt for: ${email}`);
      if (email === 'admin@myroad.app' && password === 'Admin123!ChangeMe') {
        return {
          data: {
            user: { id: 'admin-1', email, user_metadata: { role: 'admin' } },
            session: { access_token: 'mock-jwt-token', refresh_token: 'mock-refresh-token' }
          },
          error: null
        };
      }
      return { data: null, error: { message: 'Invalid credentials' } };
    },
    signOut: async () => ({ error: null }),
    refreshSession: async () => ({
      data: { session: { access_token: 'mock-new-token', refresh_token: 'mock-new-refresh' } },
      error: null
    }),
  },
  from: (table: string) => ({
    select: (cols: string = '*') => ({
      eq: (col: string, val: any) => ({
        single: async () => {
          if (table === 'profiles' && val === 'admin@myroad.app') {
            return { data: { id: 'admin-1', email: 'admin@myroad.app' }, error: null };
          }
          return { data: null, error: { message: 'Not found' } };
        }
      })
    }),
    update: (data: any) => ({
      eq: (col: string, val: any) => Promise.resolve({ data: null, error: null })
    })
  })
});
