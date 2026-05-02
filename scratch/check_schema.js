
import { supabaseAdmin } from '../api/utils/supabaseClient.js';

async function checkSchema() {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching project:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Project columns:', Object.keys(data[0]));
    console.log('Sample project:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No projects found to inspect schema.');
  }
}

checkSchema();
