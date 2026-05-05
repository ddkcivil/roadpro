import { mongodb } from '../lib/mongodb';
import { supabaseAdmin } from '../api/utils/supabaseClient';

async function checkSync() {
  try {
    console.log('Starting sync check between MongoDB users and Supabase profiles...');

    // 1. Fetch all users from MongoDB
    const collection = await mongodb.db.collection('users');
    const mongoUsers = await (await collection.find({})).toArray();
    console.log(`Found ${mongoUsers.length} users in MongoDB.`);

    // 2. Fetch all profile IDs from Supabase
    const { data: supabaseProfiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id');

    if (error) {
      console.error('Error fetching Supabase profiles:', error);
      return;
    }

    const supabaseIds = new Set(supabaseProfiles.map((p: any) => p.id));
    console.log(`Found ${supabaseIds.size} profiles in Supabase.`);

    // 3. Compare
    const missingInSupabase = mongoUsers.filter(user => !supabaseIds.has(user._id));

    if (missingInSupabase.length === 0) {
      console.log('All MongoDB users are correctly synced to Supabase.');
    } else {
      console.warn(`Found ${missingInSupabase.length} users missing from Supabase:`);
      missingInSupabase.forEach(user => {
        console.warn(`- ID: ${user._id}, Email: ${user.email}, Name: ${user.full_name}`);
      });
    }

  } catch (error) {
    console.error('Error during sync check:', error);
  } finally {
    process.exit();
  }
}

checkSync();

