import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
s.from('messages').select('*').limit(1).then(({data}) => {
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log('No data');
  }
});
