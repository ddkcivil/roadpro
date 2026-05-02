
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './api/staff/index.js';

async function test() {
  const req = {
    method: 'GET',
    query: { category: 'employees' },
    headers: { authorization: 'Bearer placeholder' }
  } as any;
  
  const res = {
    status: (code: number) => {
        console.log('Status:', code);
        return res;
    },
    json: (data: any) => {
        console.log('JSON:', JSON.stringify(data, null, 2));
        return res;
    },
    end: () => console.log('End')
  } as any;

  try {
    console.log('Calling Staff Handler...');
    await handler(req, res);
  } catch (e: any) {
    console.error('Handler threw:', e.message);
  }
}

test();
