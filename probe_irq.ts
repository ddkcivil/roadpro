import { createClient } from '@supabase/supabase-js';

// The project ID from the user's metadata or previous turn
const url = 'https://irqndyqmjvxlscuunpxw.supabase.co';
// We don't have the anon key for this one, but we can try the one from .env if it matches
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function probeIrq() {
  const cols = ['project_id', 'projectId', 'sender_id', 'senderId', 'receiver_id', 'receiverId', 'read_at', 'readAt', 'content', 'timestamp', 'createdAt'];
  console.log('Probing all columns in IRQ project messages table...');
  
  for (const col of cols) {
    try {
      const { error } = await supabase.from('messages').select(col).limit(1);
      if (error) {
        console.log(`❌ ${col}: ${error.message}`);
      } else {
        console.log(`✅ ${col} EXISTS!`);
      }
    } catch (e: any) {
       console.log(`💥 ${col}: ${e.message}`);
    }
  }
}

probeIrq();
