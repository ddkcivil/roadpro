import { supabaseAdmin } from './api/utils/supabaseClient.ts';

async function probeColumns() {
  console.log('Probing "messages" table columns...');
  
  // Try to insert a row with receiverId (camelCase)
  const { error: errorCamel } = await supabaseAdmin
    .from('messages')
    .insert([{ content: 'test', receiverId: 'test' }]);
  
  if (errorCamel) {
    console.log('Insert with receiverId failed:', errorCamel.message);
  } else {
    console.log('Insert with receiverId SUCCEEDED!');
    return;
  }

  // Try to insert a row with receiver_id (snake_case)
  const { error: errorSnake } = await supabaseAdmin
    .from('messages')
    .insert([{ content: 'test', receiver_id: 'test' }]);
  
  if (errorSnake) {
    console.log('Insert with receiver_id failed:', errorSnake.message);
  } else {
    console.log('Insert with receiver_id SUCCEEDED!');
    return;
  }
  
  // Try to insert a row with just content to see if it works at all
  const { data, error: errorMin } = await supabaseAdmin
    .from('messages')
    .insert([{ content: 'test' }])
    .select();
    
  if (errorMin) {
    console.log('Insert with just content failed:', errorMin.message);
  } else {
    console.log('Insert with just content succeeded. Columns in returned data:', Object.keys(data[0]));
  }
}

probeColumns();

