
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isPlaceholder = (val: string | undefined) => !val || val.includes('your-project') || val.includes('your-anon');

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey) || isPlaceholder(supabaseServiceKey)) {
    console.error("❌ CRITICAL: Supabase environment variables are missing or are placeholder values.");
    console.error("   Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in your .env file.");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey || supabaseAnonKey!);

async function createAdminUserViaSupabaseDashboard() {
    const adminEmail = 'dharmadkunwar20@gmail.com'; // User specified email
    const adminPassword = 'ddK152207'; // User specified password
    const adminName = 'Project Admin'; // Default name

    console.log(`Attempting to set ${adminEmail} as Admin/Project Manager...`);

    // Note: Supabase auth.admin.createUser requires the user to be confirmed already.
    // For manual setup, it's usually easier to create the user via the Supabase Auth UI,
    // then update their role in the profiles table.

    console.log(`
1. Please go to your Supabase project dashboard.`);
    console.log(`   Navigate to 'Authentication' > 'Users'.`);
    console.log(`2. Manually create a new user with the following details:`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   (You may need to confirm their email if auto-confirmation is off)`);
    console.log(`3. Once the user exists in Supabase Auth, go to 'SQL Editor'.`);
    console.log(`4. Run the following SQL command to grant admin privileges:`);
    console.log(`
   UPDATE public.profiles SET role = 'Admin' WHERE id = (SELECT id FROM auth.users WHERE email = '${adminEmail}');`);
    console.log(`
   (Alternatively, if 'Admin' role does not exist, use 'PROJECT_MANAGER' or an existing role.`);
    console.log(`   If the user doesn't exist in 'profiles', you might need to manually insert them with their Supabase Auth ID.`);
    console.log(`
✅ After manual setup, please test login with these credentials.`);
}

createAdminUserViaSupabaseDashboard();
