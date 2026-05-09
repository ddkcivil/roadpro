/**
 * Test Project Search Functionality
 * 
 * This script tests the searchProjects function to verify it works correctly.
 * Run with: npx tsx scratch/test_project_search.ts
 */

import { apiService } from '../services/api/apiService';

async function runSearchTests() {
  console.log('=== Testing Project Search Functionality ===\n');

  try {
// Test 1: Search by project code (proj-xxxxx)
    console.log('Test 1: Search by code "proj-"...');
    const result1 = await apiService.searchProjects('proj-', { field: 'code', limit: 10 });
    console.log(`Found ${result1.count} projects matching "proj-"`);
    result1.data.forEach(p => console.log(`  - Code: ${(p as any).code}, Name: ${p.name}`));

    // Test 2: Search by name
    console.log('\nTest 2: Search by name "highway"...');
    const result2 = await apiService.searchProjects('highway', { field: 'name', limit: 10 });
    console.log(`Found ${result2.count} projects matching "highway"`);
    result2.data.forEach(p => console.log(`  - Name: ${p.name}, Client: ${p.client}`));

    // Test 3: Search by client
    console.log('\nTest 3: Search by client "council"...');
    const result3 = await apiService.searchProjects('council', { field: 'client', limit: 10 });
    console.log(`Found ${result3.count} projects matching "council"`);
    result3.data.forEach(p => console.log(`  - Client: ${p.client}, Name: ${p.name}`));

    // Test 4: General search (all fields)
    console.log('\nTest 4: General search "rls" (all fields)...');
    const result4 = await apiService.searchProjects('rls', { limit: 10 });
    console.log(`Found ${result4.count} projects matching "rls"`);
    result4.data.forEach(p => console.log(`  - Name: ${p.name}, Client: ${p.client}, ID: ${p.id}`));

    // Test 5: Search by UUID pattern
    console.log('\nTest 5: Search by UUID pattern "00000000" (exact ID match)...');
    const result5 = await apiService.searchProjects('00000000-0000-0000-0000-000000000001', { field: 'id', limit: 10 });
    console.log(`Found ${result5.count} projects matching the UUID`);
    result5.data.forEach(p => console.log(`  - ID: ${p.id}, Name: ${p.name}`));

    console.log('\n=== All Tests Completed ===');
  } catch (error) {
    console.error('Error during search tests:', error);
  }
}

runSearchTests();
