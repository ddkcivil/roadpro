
import 'dotenv/config';
import { supabaseAdmin } from './api/_utils/supabaseClient.ts';

async function debug() {
  const { data, error } = await supabaseAdmin.from('projects').select('*').limit(1);
  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }
  if (data && data.length > 0) {
    console.log('Columns in projects table:', Object.keys(data[0]));
  } else {
    console.log('Projects table is empty. Trying to insert a dummy row to see columns? No, better just check schema.');
    // Try to get one row from messages to see if it has project_id or projectId
    const { data: msgData } = await supabaseAdmin.from('messages').select('*').limit(1);
    if (msgData && msgData.length > 0) {
        console.log('Columns in messages table:', Object.keys(msgData[0]));
    }
  }
}

debug();
