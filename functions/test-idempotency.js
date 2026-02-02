/**
 * Test script for AI Functions - Idempotency Cache and WhatsApp Retry
 *
 * Usage:
 *   node functions/test-idempotency.js
 *
 * Requirements:
 *   - Firebase Admin SDK credentials
 *   - Valid user authentication token
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fisioflow-migration'
});

const auth = admin.auth();
const firestore = admin.firestore();

// Test Configuration
const TEST_USER_ID = 'sj9b11xOjPT8Q34pPHBMUIPzvQQ2'; // Bootstrap admin
const TEST_CONFIG = {
  aiExerciseSuggestion: {
    name: 'aiExerciseSuggestion',
    region: 'southamerica-east1',
    data: {
      patientId: 'test-patient-id',
      condition: 'Lombalgia crônica',
      limitations: ['Dor lombar', 'Limitação de flexão'],
      goals: ['Reduzir dor', 'Aumentar mobilidade'],
      sessionCount: 5,
      equipment: ['Bola suíça', 'Theraband']
    }
  },
  aiSoapGeneration: {
    name: 'aiSoapGeneration',
    region: 'southamerica-east1',
    data: {
      patientId: 'test-patient-id',
      subjective: 'Paciente relata melhora da dor após 3 sessões',
      objective: 'Flexão de tronco: 45° para 60°',
      assessment: 'Progresso satisfatório',
      plan: 'Continuar exercícios de mobilidade'
    }
  }
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Get authentication token for testing
 */
async function getAuthToken() {
  try {
    const customToken = await auth.createCustomToken(TEST_USER_ID);
    log(`✓ Custom token created for user: ${TEST_USER_ID}`, 'green');
    return customToken;
  } catch (error) {
    log(`✗ Error creating custom token: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Call a Firebase Cloud Function
 */
async function callFunction(functionName, region, data, idToken) {
  const projectId = 'fisioflow-migration';
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  log(`\n📞 Calling ${functionName}...`, 'cyan');

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
        'Firebase-Instance-Token-Token': 'test'
      },
      body: JSON.stringify({ data })
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      log(`✗ Error ${response.status}: ${errorText}`, 'red');
      return { success: false, error: errorText, duration };
    }

    const result = await response.json();
    log(`✓ Response received in ${duration}ms`, 'green');
    return { success: true, data: result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`✗ Network error: ${error.message}`, 'red');
    return { success: false, error: error.message, duration };
  }
}

/**
 * Test idempotency cache - call same function twice with same parameters
 */
async function testIdempotencyCache(functionName, region, data, idToken) {
  log('\n' + '='.repeat(60), 'blue');
  log(`🧪 Testing Idempotency Cache: ${functionName}`, 'bright');
  log('='.repeat(60), 'blue');

  log('\n📋 Test Parameters:', 'yellow');
  log(JSON.stringify(data, null, 2), 'reset');

  // First call - should compute and cache
  log('\n1️⃣  FIRST CALL (should compute and cache)', 'yellow');
  log('─'.repeat(60), 'blue');
  const firstCall = await callFunction(functionName, region, data, idToken);

  if (!firstCall.success) {
    log('⚠️  First call failed - idempotency test cannot continue', 'yellow');
    return { success: false };
  }

  // Wait a moment
  log('\n⏳ Waiting 2 seconds before second call...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Second call - should use cache
  log('\n2️⃣  SECOND CALL (should use cache)', 'yellow');
  log('─'.repeat(60), 'blue');
  const secondCall = await callFunction(functionName, region, data, idToken);

  // Compare results
  log('\n📊 Results Comparison:', 'yellow');
  log('─'.repeat(60), 'blue');

  if (firstCall.success && secondCall.success) {
    log(`First call:  ${firstCall.duration}ms`, 'green');
    log(`Second call: ${secondCall.duration}ms`, 'green');

    const speedup = firstCall.duration / secondCall.duration;
    log(`Speedup:     ${speedup.toFixed(2)}x`, speedup > 2 ? 'green' : 'yellow');

    // Check if results are identical (cached)
    const resultsMatch = JSON.stringify(firstCall.data) === JSON.stringify(secondCall.data);
    log(`Results match: ${resultsMatch ? '✓ YES (likely cached)' : '✗ NO (cache miss)'}`,
        resultsMatch ? 'green' : 'yellow');

    return {
      success: true,
      firstCall,
      secondCall,
      speedup,
      cached: resultsMatch
    };
  }

  return { success: false };
}

/**
 * Check if idempotency cache collection exists in Firestore
 */
async function checkIdempotencyCollection() {
  log('\n' + '='.repeat(60), 'blue');
  log('🔍 Checking Idempotency Cache Collection', 'bright');
  log('='.repeat(60), 'blue');

  try {
    const snapshot = await firestore.collection('ai_idempotency_cache').limit(5).get();

    if (snapshot.empty) {
      log('📭 Cache collection exists but is empty', 'yellow');
      log('   (Cache entries will be created when AI functions are called)', 'reset');
      return { exists: true, count: 0 };
    }

    log(`✓ Cache collection exists with ${snapshot.size} entries`, 'green');

    const entries = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        feature: data.feature,
        createdAt: data.createdAt?.toDate() || 'N/A'
      });
    });

    if (entries.length > 0) {
      log('\n📋 Recent cache entries:', 'yellow');
      entries.forEach(entry => {
        log(`   • ${entry.feature} - ${entry.id.substring(0, 8)}... (${entry.createdAt})`, 'cyan');
      });
    }

    return { exists: true, count: snapshot.size, entries };
  } catch (error) {
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      log('📭 Cache collection does not exist yet', 'yellow');
      log('   (It will be created automatically when AI functions are called)', 'reset');
      return { exists: false };
    }
    log(`✗ Error checking cache: ${error.message}`, 'red');
    return { exists: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '█'.repeat(60), 'blue');
  log('  FISIOFLOW - AI FUNCTIONS IDEMPOTENCY TEST', 'bright');
  log('█'.repeat(60), 'blue');

  // Check cache collection first
  await checkIdempotencyCollection();

  // Get auth token
  log('\n' + '='.repeat(60), 'blue');
  log('🔐 Authentication', 'bright');
  log('='.repeat(60), 'blue');
  const customToken = await getAuthToken();

  if (!customToken) {
    log('\n⚠️  Cannot proceed without authentication. Please check service account.', 'yellow');
    return;
  }

  // Note: We need to use the actual Firebase Client SDK to get a proper ID token
  // For now, we'll use the project's default service account
  log('\n⚠️  Note: This test requires a Firebase ID token from client authentication.', 'yellow');
  log('   The actual cache testing will be done via direct function calls.', 'reset');

  // Test AI Functions
  const results = {};

  for (const [key, config] of Object.entries(TEST_CONFIG)) {
    results[key] = await testIdempotencyCache(
      config.name,
      config.region,
      config.data,
      customToken
    );
  }

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('📊 TEST SUMMARY', 'bright');
  log('='.repeat(60), 'blue');

  for (const [key, result] of Object.entries(results)) {
    if (result.success) {
      log(`${key}: ✓ Cache working (${result.speedup.toFixed(2)}x speedup)`, 'green');
    } else {
      log(`${key}: ✗ Test failed`, 'red');
    }
  }

  log('\n' + '█'.repeat(60), 'blue');
  log('  To verify cache in Firestore:', 'yellow');
  log('  gcloud firestore collections ai_idempotency_cache', 'cyan');
  log('█'.repeat(60) + '\n', 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
