/**
 * Test Script for Insurance Eligibility Verification
 *
 * This script demonstrates the insurance eligibility verification system.
 * Run with: node test-insurance-eligibility.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Test data IDs (replace with actual IDs from your database)
const TEST_DATA = {
  patientId: 'patient-id-here',
  tpaId: 'tpa-id-here',
  patientInsuranceId: 'insurance-id-here',
  encounterId: 'encounter-id-here',
  bedId: 'bed-id-here',
};

/**
 * Helper function to make authenticated API calls
 */
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${method} ${endpoint}:`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Test 1: Login
 */
async function testLogin() {
  console.log('\n=== Test 1: Login ===');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123', // Change to your actual credentials
    });
    authToken = response.data.token;
    console.log('✅ Login successful');
    console.log('Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Verify Eligibility
 */
async function testVerifyEligibility() {
  console.log('\n=== Test 2: Verify Insurance Eligibility ===');
  try {
    const result = await apiCall('POST', '/api/insurance/verify-eligibility', {
      patientId: TEST_DATA.patientId,
      tpaId: TEST_DATA.tpaId,
      serviceDate: new Date().toISOString(),
    });

    console.log('✅ Eligibility verification successful');
    console.log('Status:', result.status);
    console.log('Is Eligible:', result.isEligible);
    console.log('Sum Insured:', result.sumInsured);
    console.log('Used Amount:', result.usedAmount);
    console.log('Remaining:', result.remainingAmount);
    console.log('Message:', result.message);
    console.log('Cached Result:', result.cachedResult);
    return result;
  } catch (error) {
    console.error('❌ Eligibility verification failed');
    return null;
  }
}

/**
 * Test 3: Get Coverage Details
 */
async function testGetCoverage() {
  console.log('\n=== Test 3: Get Coverage Details ===');
  try {
    const result = await apiCall('GET', `/api/insurance/coverage/${TEST_DATA.patientInsuranceId}`);

    console.log('✅ Coverage details retrieved');
    console.log('Total Used:', result.totalUsed);
    console.log('Sum Insured:', result.sumInsured);
    console.log('Remaining Coverage:', result.remainingCoverage);
    console.log('Utilization %:', result.utilizationPercentage);
    console.log('Recent Checks:', result.recentChecks.length);
    return result;
  } catch (error) {
    console.error('❌ Failed to get coverage details');
    return null;
  }
}

/**
 * Test 4: Check Coverage Limit
 */
async function testCheckCoverageLimit() {
  console.log('\n=== Test 4: Check Coverage Limit ===');
  try {
    const testAmount = 50000.00;
    const result = await apiCall('POST', `/api/insurance/coverage/${TEST_DATA.patientInsuranceId}/check-limit`, {
      amount: testAmount,
    });

    console.log('✅ Coverage limit check successful');
    console.log('Can Cover:', result.canCover);
    console.log('Requested Amount:', result.requestedAmount);
    console.log('Remaining Coverage:', result.remainingCoverage);
    console.log('Message:', result.message);
    if (result.exceedsBy) {
      console.log('Exceeds By:', result.exceedsBy);
    }
    return result;
  } catch (error) {
    console.error('❌ Failed to check coverage limit');
    return null;
  }
}

/**
 * Test 5: Get Utilization History
 */
async function testGetUtilizationHistory() {
  console.log('\n=== Test 5: Get Utilization History ===');
  try {
    const result = await apiCall('GET', `/api/insurance/utilization/${TEST_DATA.patientInsuranceId}?limit=5`);

    console.log('✅ Utilization history retrieved');
    console.log('Total Used:', result.totalUsed);
    console.log('Utilization %:', result.utilizationPercentage);
    console.log('History entries:', result.history.length);

    if (result.history.length > 0) {
      console.log('\nMost Recent Check:');
      const latest = result.history[0];
      console.log('  Checked At:', latest.checkedAt);
      console.log('  Status:', latest.status);
      console.log('  Used Amount:', latest.usedAmount);
      console.log('  Remaining:', latest.remainingAmount);
    }
    return result;
  } catch (error) {
    console.error('❌ Failed to get utilization history');
    return null;
  }
}

/**
 * Test 6: Create Admission with Insurance Verification
 */
async function testCreateAdmissionWithInsurance() {
  console.log('\n=== Test 6: Create Admission with Insurance Verification ===');
  try {
    const result = await apiCall('POST', '/api/admissions', {
      encounterId: TEST_DATA.encounterId,
      patientId: TEST_DATA.patientId,
      bedId: TEST_DATA.bedId,
      diagnosis: 'Test admission with insurance verification',
      patientInsuranceId: TEST_DATA.patientInsuranceId,
      estimatedCharges: 30000.00,
    });

    console.log('✅ Admission created with insurance verification');
    console.log('Admission ID:', result.id);
    console.log('Insurance Verified:', result.insuranceVerified);
    console.log('Insurance Verified At:', result.insuranceVerifiedAt);

    if (result.insuranceCoverage) {
      console.log('Coverage Check:');
      console.log('  Can Cover:', result.insuranceCoverage.canCover);
      console.log('  Message:', result.insuranceCoverage.message);
    }

    if (result.eligibilityCheckId) {
      console.log('Eligibility Check ID:', result.eligibilityCheckId);
    }
    return result;
  } catch (error) {
    console.error('❌ Failed to create admission with insurance');
    return null;
  }
}

/**
 * Test 7: Update Insurance Utilization (Manual)
 */
async function testUpdateUtilization() {
  console.log('\n=== Test 7: Update Insurance Utilization ===');
  try {
    const testAmount = 5000.00;
    const result = await apiCall('POST', `/api/insurance/utilization/${TEST_DATA.patientInsuranceId}/update`, {
      amount: testAmount,
      description: 'Test utilization update',
    });

    console.log('✅ Utilization updated successfully');
    console.log('Message:', result.message);
    console.log('Updated Coverage:');
    console.log('  Total Used:', result.coverage.totalUsed);
    console.log('  Remaining:', result.coverage.remainingCoverage);
    console.log('  Utilization %:', result.coverage.utilizationPercentage);
    return result;
  } catch (error) {
    console.error('❌ Failed to update utilization');
    return null;
  }
}

/**
 * Test 8: Test Cached Eligibility Result
 */
async function testCachedEligibility() {
  console.log('\n=== Test 8: Test Cached Eligibility Result ===');
  try {
    console.log('First call (should hit database):');
    const result1 = await apiCall('POST', '/api/insurance/verify-eligibility', {
      patientId: TEST_DATA.patientId,
      tpaId: TEST_DATA.tpaId,
    });
    console.log('  Cached Result:', result1.cachedResult);

    console.log('Second call (should hit cache):');
    const result2 = await apiCall('POST', '/api/insurance/verify-eligibility', {
      patientId: TEST_DATA.patientId,
      tpaId: TEST_DATA.tpaId,
    });
    console.log('  Cached Result:', result2.cachedResult);

    if (!result1.cachedResult && result2.cachedResult) {
      console.log('✅ Cache is working correctly');
    } else {
      console.log('⚠️  Cache behavior unexpected');
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to test cache');
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Insurance Eligibility Verification System - Test Suite  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Check if test data is configured
  if (TEST_DATA.patientId === 'patient-id-here') {
    console.log('\n⚠️  WARNING: Please update TEST_DATA with actual IDs from your database');
    console.log('Edit this file and replace the placeholder IDs with real data.\n');
  }

  try {
    // Test 1: Login
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
      console.log('\n❌ Login failed. Cannot proceed with tests.');
      return;
    }

    // Test 2-8: Run all tests
    await testVerifyEligibility();
    await testGetCoverage();
    await testCheckCoverageLimit();
    await testGetUtilizationHistory();
    // await testCreateAdmissionWithInsurance(); // Commented out to avoid creating test data
    // await testUpdateUtilization(); // Commented out to avoid modifying data
    await testCachedEligibility();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    Tests Completed                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testLogin,
  testVerifyEligibility,
  testGetCoverage,
  testCheckCoverageLimit,
  testGetUtilizationHistory,
  testCreateAdmissionWithInsurance,
  testUpdateUtilization,
  testCachedEligibility,
};
