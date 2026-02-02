/**
 * Direct test of AI Function using Firebase Admin SDK
 * This simulates the function call without going through HTTP
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'fisioflow-migration'
});

const { withIdempotency } = require('./lib/lib/idempotency');
const { VertexAI } = require('@google-cloud/vertexai');

// Mock function to simulate AI generation
async function mockAIGeneration(context) {
  console.log('  ⏳ Calling Vertex AI (simulated)...');

  // Simulate AI delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    exercises: [
      { name: 'Pontes', series: 3, reps: 12, rest: 60 },
      { name: 'Bird-dog', series: 3, reps: 10, rest: 45 },
      { name: 'Cat-cow stretch', series: 2, reps: 15, rest: 30 }
    ],
    recommendation: 'Exercícios para fortalecimento core',
    generatedAt: new Date().toISOString()
  };
}

async function testAIWithIdempotency() {
  console.log('\n' + '='.repeat(60));
  console.log('  TESTING AI FUNCTION WITH IDEMPOTENCY');
  console.log('='.repeat(60));

  const testUserId = 'test-user-ai';
  const testParams = {
    patientId: 'patient-123',
    condition: 'Lombalgia',
    limitations: ['Dor lombar'],
    goals: ['Fortalecimento'],
    sessionCount: 3,
    equipment: ['Bola suíça']
  };

  // Test 1: First call (should compute)
  console.log('\n📝 Test 1: First AI call (should compute and cache)');
  console.log('-'.repeat(60));
  console.log('Parameters:', JSON.stringify(testParams, null, 2));

  const start1 = Date.now();

  try {
    const result1 = await withIdempotency(
      'EXERCISE_RECOMMENDATION',
      testUserId,
      testParams,
      () => mockAIGeneration(testParams),
      { cacheTtl: 5 * 60 * 1000 }
    );

    const duration1 = Date.now() - start1;
    console.log('\n✓ First call completed in', duration1, 'ms');
    console.log('  Exercises:', result1.exercises.length);
    console.log('  Recommendation:', result1.recommendation);
  } catch (error) {
    console.log('\n✗ Error:', error.message);
  }

  // Wait a moment
  console.log('\n⏳ Waiting 1 second before second call...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Second call (should use cache)
  console.log('\n📝 Test 2: Second AI call (should use cache)');
  console.log('-'.repeat(60));
  console.log('Parameters: (same as before)');

  const start2 = Date.now();

  try {
    const result2 = await withIdempotency(
      'EXERCISE_RECOMMENDATION',
      testUserId,
      testParams,
      () => mockAIGeneration(testParams),
      { cacheTtl: 5 * 60 * 1000 }
    );

    const duration2 = Date.now() - start2;
    console.log('\n✓ Second call completed in', duration2, 'ms');

    // Compare
    const speedup = (duration1 / duration2).toFixed(2);
    console.log('\n📊 Comparison:');
    console.log('  First call:  ', duration1, 'ms (with AI generation)');
    console.log('  Second call: ', duration2, 'ms (from cache)');
    console.log('  Speedup:     ', speedup, 'x');
    console.log('  Time saved:  ', duration1 - duration2, 'ms');

    if (duration2 < 500) {
      console.log('\n✅ CACHE HIT CONFIRMED - Second call was much faster!');
    }
  } catch (error) {
    console.log('\n✗ Error:', error.message);
  }

  // Test 3: Different parameters (should compute again)
  console.log('\n📝 Test 3: Different parameters (should compute again)');
  console.log('-'.repeat(60));

  const differentParams = { ...testParams, patientId: 'patient-456' };
  console.log('Parameters:', JSON.stringify(differentParams, null, 2));

  const start3 = Date.now();

  try {
    const result3 = await withIdempotency(
      'EXERCISE_RECOMMENDATION',
      testUserId,
      differentParams,
      () => mockAIGeneration(differentParams),
      { cacheTtl: 5 * 60 * 1000 }
    );

    const duration3 = Date.now() - start3;
    console.log('\n✓ Third call completed in', duration3, 'ms');
    console.log('  (Different patient = cache miss = new computation)');
  } catch (error) {
    console.log('\n✗ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  TEST COMPLETE');
  console.log('='.repeat(60));
}

testAIWithIdempotency().catch(console.error);
