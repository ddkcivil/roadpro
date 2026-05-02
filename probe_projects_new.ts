
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

async function probe() {
  console.log('Counting projects...');
  const { count, error: countError } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Count Error:', countError);
    return;
  }
  
  console.log('Total Projects:', count);

  if (count === 0) {
      console.log('No projects found. Checking for general project...');
      const { data: general, error: genError } = await supabase.from('projects').select('*').eq('id', 'general');
      console.log('General Project:', general, genError);
      return;
  }

  const { data, error } = await supabase.from('projects').select('*').limit(1);
  console.log('Project Structure:', JSON.stringify(data?.[0], null, 2));
}

probe();
