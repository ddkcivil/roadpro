
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
      
      if (genError) {
          console.error('Error checking for general project:', genError);
          // Proceed to create if there was an error fetching, assuming it doesn't exist or can't be fetched
          console.log('Attempting to create general project...');
          const { error: insertError } = await supabase.from('projects').insert([
              { id: 'general', name: 'General Project', ownerId: 'system', created_at: new Date().toISOString(), updatedAt: new Date().toISOString() } // Assuming 'ownerId', 'created_at', 'updatedAt' are relevant fields
          ]);
          if (insertError) {
              console.error('Failed to insert general project:', insertError);
          } else {
              console.log('General project created successfully.');
          }
          return;
      }

      if (!general || general.length === 0) {
          console.log('General project not found. Creating it...');
          // Assuming default fields like ownerId, created_at, and updatedAt are relevant for projects.
          // Adjust these based on your actual project schema.
          const { error: insertError } = await supabase.from('projects').insert([
              { id: 'general', name: 'General Project', ownerId: 'system', created_at: new Date().toISOString(), updatedAt: new Date().toISOString() } 
          ]);
          if (insertError) {
              console.error('Failed to insert general project:', insertError);
          } else {
              console.log('General project created successfully.');
          }
      } else {
          console.log('General project already exists.');
      }
      return;
  }

  const { data, error } = await supabase.from('projects').select('*').limit(1);
  console.log('Project Structure:', JSON.stringify(data?.[0], null, 2));
}

probe();
