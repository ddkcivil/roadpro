
import 'dotenv/config';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
console.log('Service Key length:', key?.length);
console.log('Service Key starts with:', key?.substring(0, 10));

const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log('Anon Key length:', anon?.length);
console.log('Anon Key starts with:', anon?.substring(0, 10));
