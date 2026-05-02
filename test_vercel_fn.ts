import { supabasePublic } from './api/utils/supabaseClient.js';
import handler from './api/users.js';

async function test() {
  const { data: authData } = await supabasePublic.auth.signInWithPassword({
    email: 'test@roadproj.com',
    password: 'Roadproj123!'
  });
  
  if (!authData?.session) {
    console.error('Failed to login:', authData);
    return;
  }

  const req = {
    method: 'GET',
    query: {},
    headers: {
      authorization: 'Bearer ' + authData.session.access_token
    }
  } as any;

  const res = {
    status: (code) => {
      console.log('Status:', code);
      return {
        json: (data) => console.log('JSON:', JSON.stringify(data, null, 2)),
        end: () => console.log('End')
      }
    },
    headersSent: false
  } as any;

  await handler(req, res);
}
test();

