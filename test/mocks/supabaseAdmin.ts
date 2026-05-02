import { vi } from 'vitest';

const createMockSupabase = () => {
  const handler = {
    get: (target: any, prop: string): any => {
      if (prop === 'then') return target.then;
      return new Proxy(() => {}, handler);
    }
  };
  const base = {
    then: vi.fn().mockImplementation((onSuccess: any) => Promise.resolve({ data: null, error: null }).then(onSuccess)),
  };
  return new Proxy(base, handler);
};

export const supabaseAdmin = createMockSupabase();
