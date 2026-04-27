import { createClient } from '@supabase/supabase-js';

const url = 'https://qgjjeqasioakqhkoorcj.supabase.co';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamplcWFzaW9ha3Foa29vcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MDY0NzcsImV4cCI6MjA5MTM4MjQ3N30.89AJwDqV78KsEwwnJC2aqK0fHTpLOKD4jDbC3ATFOoQ';

const supabase = createClient(url, anon);

const expectedCols = [
  'id', 'name', 'code', 'location', 'contractor', 'startdate', 'enddate', 'contractperiod',
  'projectmanager', 'supervisor', 'consultantname', 'clientname', 'contractno', 'client', 'engineer',
  'variationorders', 'labtests', 'agencypayments', 'agencymaterials', 'agencybills',
  'subcontractorpayments', 'linearworks', 'purchaseorders', 'inventorytransactions',
  'vehiclelogs', 'sitephotos', 'dailyreports', 'preconstruction', 'preconstructiontasks',
  'landparcels', 'mapoverlays', 'kmldata', 'contractbills', 'subcontractorbills',
  'measurementsheets', 'stafflocations', 'environmentregistry', 'resourceallocations',
  'complianceworkflows', 'auditlogs', 'structuretemplates', 'accountingintegrations',
  'accountingtransactions', 'lastsynced', 'spreadsheetid', 'createdat', 'updatedat',
  'owner_id', 'description', 'created_at', 'updated_at', 'roads', 'hindrances', 'ncrs',
  'boq', 'rfis', 'schedule', 'structures', 'agencies', 'inventory', 'vehicles', 'documents'
];

async function check() {
  console.log('Probing projects table for expected columns...\n');
  const missing: string[] = [];
  const found: string[] = [];

  for (const col of expectedCols) {
    const { error } = await supabase.from('projects').select(col).limit(1);
    if (error) {
      missing.push(col);
    } else {
      found.push(col);
    }
  }

  console.log(`✅ FOUND (${found.length}):`, found.join(', '));
  console.log(`\n❌ MISSING (${missing.length}):`, missing.join(', '));

  // Also check other tables
  const tables = ['profiles', 'messages', 'staff_locations', 'registrations', 'audit_logs', 'project_documents', 'document_versions', 'boq_items', 'rfis', 'daily_reports', 'vehicles'];
  console.log('\n--- Table Existence Check ---');
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table} exists`);
    }
  }
}

check();
