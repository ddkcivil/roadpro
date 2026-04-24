import { createClient } from '@supabase/supabase-js';

const url = 'https://irqndyqmjvxlscuunpxw.supabase.co';
// I'll try to find the anon key for this one... wait, maybe I can find it in the browser?
// Actually, I'll just check if it's the one from .env (unlikely but worth a shot)
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

async function countUsersIrq() {
  console.log('Counting users in irqndyqmjvxlscuunpxw...');
  const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('User count:', count);
  }
}

countUsersIrq();
