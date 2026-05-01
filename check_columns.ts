
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumns() {
  console.log('Checking columns for "messages" table...');
  
  // Since I don't have service key for cloud, I'll try to insert a dummy row or just select * with limit 1
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('Table is empty. Trying to insert and rollback...');
    // I can't really rollback easily without a transaction, but I can try a dummy insert
    // But I don't know the schema!
    
    // Let's try to use information_schema via RPC if it exists
    const { data: cols, error: rpcError } = await supabase.rpc('get_columns', { table_name: 'messages' });
    if (rpcError) {
      console.log('RPC failed:', rpcError.message);
    } else {
      console.log('Columns (via RPC):', cols);
    }
  }
}

checkColumns();
