import { supabaseAdmin } from './api/utils/supabaseClient.ts';

async function listColumns() {
  console.log('Fetching columns for "messages" table...');
  const { data, error } = await supabaseAdmin.rpc('get_table_columns', { table_name_param: 'messages' });
  
  if (error) {
    // If RPC fails, try a direct query to information_schema if possible
    console.log('RPC failed, trying direct SQL query via select...');
    const { data: cols, error: colError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .limit(1);
    
    if (colError) {
      console.error('Failed to fetch even one row:', colError.message);
      return;
    }
    
    if (cols && cols.length > 0) {
      console.log('Sample row keys:', Object.keys(cols[0]));
    } else {
      console.log('Table is empty, cannot determine columns from data.');
    }
  } else {
    console.log('Columns:', data);
  }
}

listColumns();

