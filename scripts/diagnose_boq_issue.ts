/**
 * BOQ Diagnostic Script
 * 
 * Run this to verify BOQ data is being properly fetched and stored.
 * This helps debug the BOQ synchronization issue.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseBoqIssue() {
  console.log('🔍 BOQ Diagnostic Started...\n');

  try {
    // 1. Check if projects table exists and has BOQ field
    console.log('1️⃣ Checking projects table structure...');
    const { data: schemaData, error: schemaError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .limit(1);

    if (schemaError) {
      console.error('❌ Error querying projects:', schemaError.message);
      return;
    }

    if (!schemaData || schemaData.length === 0) {
      console.warn('⚠️ No projects found in database');
    } else {
      const firstProject = schemaData[0];
      if ('boq' in firstProject) {
        console.log('✅ BOQ field exists in projects table');
        console.log(`   Type of boq in first project: ${typeof firstProject.boq}`);
        console.log(`   Is array: ${Array.isArray(firstProject.boq)}`);
      } else {
        console.error('❌ BOQ field NOT FOUND in projects table');
      }
    }

    // 2. Find projects with BOQ data
    console.log('\n2️⃣ Searching for projects with BOQ data...');
    const { data: projectsWithBoq, error: boqError } = await supabaseAdmin
      .from('projects')
      .select('id, name, boq')
      .not('boq', 'is', null);

    if (boqError) {
      console.error('❌ Error querying BOQ:', boqError.message);
    } else if (!projectsWithBoq || projectsWithBoq.length === 0) {
      console.warn('⚠️ No projects with BOQ data found (all BOQ fields are null)');
    } else {
      console.log(`✅ Found ${projectsWithBoq.length} project(s) with BOQ data:`);
      projectsWithBoq.slice(0, 3).forEach(proj => {
        const boqArray = Array.isArray(proj.boq) ? proj.boq : [];
        console.log(`   - ${proj.name}: ${boqArray.length} items`);
        if (boqArray.length > 0) {
          console.log(`     First item: ${boqArray[0].itemNo || 'N/A'} - ${boqArray[0].description || 'N/A'}`);
        }
      });
    }

    // 3. Check for projects with empty BOQ arrays
    console.log('\n3️⃣ Checking for projects with empty BOQ arrays...');
    const { data: allProjects, error: allError } = await supabaseAdmin
      .from('projects')
      .select('id, name, boq');

    if (!allError && allProjects) {
      const withEmptyBoq = allProjects.filter(p => Array.isArray(p.boq) && p.boq.length === 0);
      const withNullBoq = allProjects.filter(p => p.boq === null);
      
      if (withEmptyBoq.length > 0) {
        console.log(`⚠️ Found ${withEmptyBoq.length} projects with empty BOQ arrays`);
      }
      if (withNullBoq.length > 0) {
        console.log(`⚠️ Found ${withNullBoq.length} projects with NULL BOQ field`);
      }
    }

    // 4. Validate BOQ data structure
    console.log('\n4️⃣ Validating BOQ data structure...');
    if (projectsWithBoq && projectsWithBoq.length > 0) {
      const project = projectsWithBoq[0];
      const boqArray = Array.isArray(project.boq) ? project.boq : [];
      
      if (boqArray.length > 0) {
        const boqItem = boqArray[0];
        const requiredFields = ['id', 'itemNo', 'description', 'unit', 'quantity', 'rate', 'amount'];
        const missingFields = requiredFields.filter(f => !(f in boqItem));
        
        if (missingFields.length === 0) {
          console.log(`✅ BOQ data structure is valid`);
          console.log(`   Sample item keys: ${Object.keys(boqItem).join(', ')}`);
        } else {
          console.warn(`⚠️ BOQ items missing fields: ${missingFields.join(', ')}`);
        }
      }
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error: any) {
    console.error('❌ Unexpected error during diagnosis:', error.message);
  }
}

// Run the diagnostic
diagnoseBoqIssue().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
