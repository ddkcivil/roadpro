// import { mongodb } from '../lib/mongodb';
import { getSupabaseAdmin } from '../api/utils/supabaseClient';
import { hashPassword } from '../api/utils/mongoAuth';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// async function migrate() {
//   console.log('Starting migration from Supabase to MongoDB...');

//   try {
//     // 1. Fetch all profiles from Supabase
//     const { data: profiles, error: profileError } = await getSupabaseAdmin()
//       .from('profiles')
//       .select('*');

//     if (profileError) {
//       console.error('Error fetching profiles:', profileError);
//       return;
//     }

//     console.log(`Found ${profiles?.length || 0} profiles to migrate.`);

//     // 2. Fetch all users from Supabase Auth (to get emails)
//     const { data: { users: authUsers }, error: authError } = await getSupabaseAdmin().auth.admin.listUsers();

//     if (authError) {
//       console.error('Error fetching auth users:', authError);
//       return;
//     }

//     const emailMap = new Map(authUsers.map(u => [u.id, u.email]));

//     // 3. Migrate to MongoDB
//     for (const profile of profiles || []) {
//       const email = emailMap.get(profile.id) || `migrated-${profile.id}@example.com`;
      
//       const existingUser = await mongodb.db.collection('users').findOne({ email: email.toLowerCase() });
//       if (existingUser) {
//         console.log(`User ${email} already exists in MongoDB, skipping.`);
//         continue;
//       }

//       const newUser = {
//         _id: profile.id, // Keep the same ID if possible
//         email: email.toLowerCase(),
//         passwordHash: await hashPassword('temporary-password-change-me'), // Default password
//         full_name: profile.full_name,
//         role: profile.role || 'SITE_ENGINEER',
//         avatar_url: profile.avatar_url,
//         last_seen: profile.last_seen,
//         phone: profile.phone || '',
//         created_at: profile.created_at || new Date().toISOString()
//       };

//       await mongodb.db.collection('users').insertOne(newUser);
//       console.log(`Migrated user: ${email}`);
//     }

//     // 4. Migrate registrations
//     const { data: registrations, error: regError } = await getSupabaseAdmin()
//       .from('registrations')
//       .select('*');

//     if (regError) {
//       console.warn('Error fetching registrations (might not exist):', regError.message);
//     } else {
//       console.log(`Found ${registrations?.length || 0} registrations to migrate.`);
//       for (const reg of registrations || []) {
//         const existingReg = await mongodb.db.collection('registrations').findOne({ email: reg.email.toLowerCase() });
//         if (existingReg) continue;

//         await mongodb.db.collection('registrations').insertOne({
//           _id: reg.id || uuidv4(),
//           name: reg.name,
//           email: reg.email.toLowerCase(),
//           phone: reg.phone || '',
//           passwordhash: reg.passwordhash || '',
//           requestedrole: reg.requestedrole || reg.requested_role || 'SITE_ENGINEER',
//           status: reg.status || 'pending',
//           created_at: reg.created_at || new Date().toISOString()
//         });
//         console.log(`Migrated registration: ${reg.email}`);
//       }
//     }

//     console.log('Migration completed successfully.');
//   } catch (error) {
//     console.error('Migration failed:', error);
//   } finally {
//     await mongodb.close();
//   }
// }

// migrate();

