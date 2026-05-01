
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Checking tables in Cloud Supabase...');
  
  const tables = ['profiles', 'messages', 'projects', 'staff_locations'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.log(`❌ Table "${table}": ${error.message}`);
      if (error.details) console.log(`   Details: ${error.details}`);
    } else {
      console.log(`✅ Table "${table}": OK (${count} rows)`);
    }
  }
}

checkTables();
