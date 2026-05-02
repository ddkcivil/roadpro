
import { createClient } from '@supabase/supabase-js';
import { mapProjectToDb } from '../api/utils/mappers.js';

// Load from local environment variables or hardcode for test script
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbWRib3ZzcHhwdnhscW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzE2NTI4MCwiZXhwIjoyMDQ4NzQxMjgwfQ dummy';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// TODO: Set SUPABASE_SERVICE_KEY env var before running: export SUPABASE_SERVICE_KEY=your_key

async function seedData() {
  console.log('Seeding mock data...');

  // 1. Create a dummy project (ID must be a valid UUID)
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert([
      mapProjectToDb({
        id: '123e4567-e89b-12d3-a456-426614174000', 
        name: 'Mock Highway Project',
        client: 'Department of Roads',
        updatedAt: new Date().toISOString()
      })
    ])
    .select()
    .single();

  if (projectError) {
    console.error('Error creating project:', projectError.message);
  } else {
    console.log('Project created:', project.id);
  }

  // 2. Create a mock user in 'profiles'
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .insert([
      {
        id: '3c0f4f72-747f-4f0e-8d8a-6a5a9c3d4f5e', // Valid UUID
        full_name: 'Test Engineer',
        role: 'SITE_ENGINEER'
      }
    ])
    .select()
    .single();

  if (userError) {
    console.error('Error creating user profile:', userError.message);
  } else {
    console.log('Profile created:', user.full_name);
  }

  // 3. Create a mock message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert([
      {
        project_id: '123e4567-e89b-12d3-a456-426614174000',
        sender_id: '3c0f4f72-747f-4f0e-8d8a-6a5a9c3d4f5e',
        content: 'Hello, this is a mock message for the project.',
        receiver_id: 'general'
      }
    ]);

  if (messageError) {
    console.error('Error creating message:', messageError.message);
  } else {
    console.log('Message created.');
  }

  console.log('Mock data seeding complete.');
}

seedData();

