import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
s.from('messages').select('project_id').limit(1).then(({error, data}) => {
  if (error) {
    console.log('Error (project_id):', error.message);
    s.from('messages').select('projectId').limit(1).then(({error, data}) => {
      console.log('Error (projectId):', error?.message);
    });
  } else {
    console.log('Success (project_id):', data);
  }
});
