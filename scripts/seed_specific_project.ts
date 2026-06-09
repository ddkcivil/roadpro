/**
 * Script to seed a specific project with ID a45055fb-8135-496d-9fbb-f96567cf110f
 * Run: npx tsx scripts/seed_specific_project.ts
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually
try {
  const envContent = readFileSync('./.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=').trim();
    }
  });
  console.log('Loaded .env.local');
} catch (e) {
  console.log('No .env.local found, using process.env');
}

const SPECIFIC_PROJECT_ID = 'a45055fb-8135-496d-9fbb-f96567cf110f';
const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000000'; // From seed.sql

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n=== Seeding Specific Project ===\n');
console.log('Project ID:', SPECIFIC_PROJECT_ID);
console.log('Project:', supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedSpecificProject() {
  console.log('\n1. Checking if project already exists...');
  
  const { data: existingProject, error: selectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', SPECIFIC_PROJECT_ID)
    .single();

  if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error('Error checking for existing project:', selectError.message);
    process.exit(1);
  }

  if (existingProject) {
    console.log(`Project already exists: ${existingProject.name} (${existingProject.id})`);
    console.log('\n=== Seeding Complete (Project already existed) ===\n');
    return;
  }

  console.log('\n2. Inserting specific project...');
  
    const { data: insertedProject, error: insertError } = await supabase
      .from('projects')
      .insert({
        id: SPECIFIC_PROJECT_ID,
        name: 'Specific Test Project',
        description: 'Project seeded for specific ID testing',
        created_by: ADMIN_USER_ID,
        client: 'Test Client',
        created_at: new Date().toISOString()
      })
      .select();

  if (insertError) {
    console.error('Error inserting project:', insertError.message);
    process.exit(1);
  }

  console.log('✓ Specific project seeded successfully!');
  console.log('Inserted project:', JSON.stringify(insertedProject, null, 2));
  
  console.log('\n=== Seeding Complete ===\n');
}

seedSpecificProject().catch(console.error);