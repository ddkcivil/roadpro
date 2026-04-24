import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function checkProductionAll() {
  const cols = ['project_id', 'projectId', 'sender_id', 'senderId', 'receiver_id', 'receiverId', 'read_at', 'readAt', 'content', 'timestamp', 'createdAt'];
  console.log('Probing all columns in production messages table...');
  
  for (const col of cols) {
    const { error } = await supabase.from('messages').select(col).limit(1);
    if (error) {
      console.log(`❌ ${col} does NOT exist.`);
    } else {
      console.log(`✅ ${col} EXISTS!`);
    }
  }
}

checkProductionAll();
