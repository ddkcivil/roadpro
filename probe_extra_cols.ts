import { createClient } from '@supabase/supabase-js';
const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';
const supabase = createClient(url, anon);
async function check() {
  for (const col of ['personnel', 'agency_materials', 'subcontractor_payments', 'purchase_orders', 'accounting_integrations', 'accounting_transactions', 'structure_templates']) {
    const { error } = await supabase.from('projects').select(col).limit(1);
    console.log(error ? `❌ ${col}: ${error.message}` : `✅ ${col}`);
  }
}
check();
