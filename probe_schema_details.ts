import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function check() {
  // Check projects data sample
  const { data: projects, error: pErr } = await supabase.from('projects').select('*').limit(3);
  if (pErr) {
    console.log('Projects error:', pErr.message);
  } else {
    console.log('Projects sample rows:', projects?.length || 0);
    if (projects && projects.length > 0) {
      console.log('First project keys:', Object.keys(projects[0]).sort().join(', '));
      console.log('First project ID type:', typeof projects[0].id, projects[0].id);
      console.log('First project ID sample:', JSON.stringify(projects[0].id).substring(0, 60));
    }
  }

  // Check messages column expectations
  const msgCols = ['project_id', 'projectId', 'sender_id', 'senderId', 'receiver_id', 'receiverId', 'content', 'timestamp', 'read', 'created_at', 'read_at'];
  console.log('\n--- Messages columns ---');
  for (const col of msgCols) {
    const { error } = await supabase.from('messages').select(col).limit(1);
    console.log(error ? `❌ ${col}` : `✅ ${col}`);
  }

  // Check staff_locations
  const { data: sl, error: slErr } = await supabase.from('staff_locations').select('*').limit(2);
  console.log('\n--- Staff locations ---');
  if (slErr) {
    console.log('Error:', slErr.message);
  } else {
    console.log('Rows:', sl?.length || 0);
    if (sl && sl.length > 0) {
      console.log('Keys:', Object.keys(sl[0]).join(', '));
      console.log('Sample project_id:', sl[0].project_id, typeof sl[0].project_id);
    }
  }

  // Try to check registrations
  const { data: reg, error: regErr } = await supabase.from('registrations').select('*').limit(1);
  console.log('\n--- Registrations ---');
  if (regErr) {
    console.log('Error:', regErr.message);
  } else {
    console.log('Rows:', reg?.length || 0);
    if (reg && reg.length > 0) {
      console.log('Keys:', Object.keys(reg[0]).join(', '));
    }
  }
}

check();
