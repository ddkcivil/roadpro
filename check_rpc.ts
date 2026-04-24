import { supabaseAdmin } from './api/_utils/supabaseClient.ts';

async function checkRpc() {
  console.log('Checking "append_road_to_project" RPC...');
  const { data, error } = await supabaseAdmin.rpc('append_road_to_project', {
    project_id: 'non-existent-id',
    new_road_data: {}
  });
  
  if (error && error.message.includes('could not find the function')) {
    console.log('❌ RPC missing!');
  } else {
    console.log('✅ RPC exists (or gave a logic error instead of existence error)');
  }
}

checkRpc();
