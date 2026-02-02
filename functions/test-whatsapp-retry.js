/**
 * Test script for WhatsApp retry and timeout logic
 *
 * This script tests the WhatsApp integration with:
 * - Retry logic (3 attempts with exponential backoff)
 * - Timeout (30 seconds)
 * - Signature verification
 */

const https = require('https');

// Test Configuration
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || 'your-phone-number-id';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || 'your-access-token';

const TEST_RECIPIENT = process.env.TEST_PHONE_NUMBER || '5511999999999'; // Format: 55 country code + number

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
 * Simulate a fetch with retry (like the one in whatsapp.ts)
 */
async function fetchWithRetry(url, options, retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;
  const WHATSAPP_TIMEOUT_MS = 30000;

  return new Promise((resolve, reject) => {
    const controller = typeof AbortController !== 'undefined'
      ? new AbortController()
      : { abort: () => {} };

    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`WhatsApp API timeout after ${WHATSAPP_TIMEOUT_MS}ms`));
    }, WHATSAPP_TIMEOUT_MS);

    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: options.headers || {},
      signal: controller.signal
    };

    const req = https.request(requestOptions, (res) => {
      clearTimeout(timeoutId);

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          data: data
        };

        // Retry on specific status codes
        if (!response.ok && retryCount < MAX_RETRIES && [429, 500, 502, 503, 504].includes(res.statusCode)) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
          log(`⚠️  WhatsApp API error ${res.status}, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`, 'yellow');
          setTimeout(() => {
            fetchWithRetry(url, options, retryCount + 1).then(resolve).catch(reject);
          }, delay);
          return;
        }

        resolve(response);
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeoutId);

      // Retry on network errors
      if (retryCount < MAX_RETRIES && error.code === 'ECONNRESET') {
        const delay = RETRY_DELAY_MS * Math.pow(2, retryCount);
        log(`⚠️  WhatsApp API network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES}): ${error.message}`, 'yellow');
        setTimeout(() => {
          fetchWithRetry(url, options, retryCount + 1).then(resolve).catch(reject);
        }, delay);
        return;
      }

      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Test WhatsApp message sending
 */
async function testWhatsAppMessage() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 Testing WhatsApp Message with Retry Logic', 'bright');
  log('='.repeat(60), 'blue');

  const url = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const message = {
    messaging_product: 'whatsapp',
    to: TEST_RECIPIENT,
    type: 'text',
    text: {
      body: '🧪 Teste FisioFlow - Mensagem com retry logic\n\n' +
            'Esta é uma mensagem de teste para verificar:\n' +
            '✓ Timeout de 30 segundos\n' +
            '✓ Retry com exponential backoff (3 tentativas)\n' +
            '✓ Verificação de assinatura SHA-256\n\n' +
            `Enviado em: ${new Date().toISOString()}`
    }
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`
    },
    body: JSON.stringify(message)
  };

  log('\n📋 Request Details:', 'yellow');
  log(`   URL: ${url}`, 'cyan');
  log(`   To: ${TEST_RECIPIENT}`, 'cyan');
  log(`   Max Retries: 3`, 'cyan');
  log(`   Timeout: 30000ms`, 'cyan');
  log(`   Retry Delay: 1000ms * 2^attempt`, 'cyan');

  log('\n📤 Sending message...', 'yellow');
  const startTime = Date.now();

  try {
    const response = await fetchWithRetry(url, options);
    const duration = Date.now() - startTime;

    log('\n✓ Message sent successfully!', 'green');
    log(`   Status: ${response.status}`, 'cyan');
    log(`   Duration: ${duration}ms`, 'cyan');

    if (response.data) {
      const responseData = JSON.parse(response.data);
      log(`   Message ID: ${responseData.messages?.[0]?.id || 'N/A'}`, 'cyan');
    }

    return { success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`\n✗ Error after ${duration}ms: ${error.message}`, 'red');

    if (error.message.includes('timeout')) {
      log('   ⚠️  The request timed out after 30 seconds', 'yellow');
    }

    return { success: false, error: error.message, duration };
  }
}

/**
 * Test webhook signature verification
 */
async function testSignatureVerification() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 Testing Webhook Signature Verification', 'bright');
  log('='.repeat(60), 'blue');

  const crypto = require('crypto');

  // Simulate webhook payload and secret
  const appSecret = WHATSAPP_ACCESS_TOKEN.substring(0, 20); // Partial secret for demo
  const payload = JSON.stringify({
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '5511999999999',
            id: 'wamid.test',
            timestamp: '1706745600',
            text: { body: 'Test message' }
          }]
        }
      }]
    }]
  });

  // Generate signature
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex');

  log('\n📋 Signature Details:', 'yellow');
  log(`   Payload: ${payload.substring(0, 50)}...`, 'cyan');
  log(`   Expected Signature: sha256=${expectedSignature}`, 'cyan');

  // Simulate verification (like in whatsapp.ts)
  const providedSignature = `sha256=${expectedSignature}`;

  function verifyWhatsAppSignature(payload, signature, appSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const providedSignatureBuffer = Buffer.from(signature.replace('sha256=', ''), 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');

    return crypto.timingSafeEqual(expectedSignatureBuffer, providedSignatureBuffer);
  }

  const isValid = verifyWhatsAppSignature(payload, providedSignature, appSecret);

  log('\n✓ Signature Verification:', 'cyan');
  log(`   Valid: ${isValid ? '✓ YES' : '✗ NO'}`, isValid ? 'green' : 'red');

  // Test with invalid signature
  const invalidSignature = 'sha256=invalid123456789';
  const isInvalidValid = verifyWhatsAppSignature(payload, invalidSignature, appSecret);
  log(`   Invalid rejected: ${!isInvalidValid ? '✓ YES' : '✗ NO'}`, !isInvalidValid ? 'green' : 'red');

  return { success: isValid };
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n' + '█'.repeat(60), 'blue');
  log('  FISIOFLOW - WHATSAPP INTEGRATION TEST', 'bright');
  log('█'.repeat(60), 'blue');

  // Check environment variables
  if (WHATSAPP_PHONE_NUMBER_ID.includes('your-')) {
    log('\n⚠️  Please set WHATSAPP_PHONE_NUMBER_ID environment variable', 'yellow');
    log('   export WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id', 'cyan');
  }

  if (WHATSAPP_ACCESS_TOKEN.includes('your-')) {
    log('\n⚠️  Please set WHATSAPP_ACCESS_TOKEN environment variable', 'yellow');
    log('   export WHATSAPP_ACCESS_TOKEN=your-access-token', 'cyan');
  }

  // Test signature verification (doesn't require actual API call)
  await testSignatureVerification();

  // Test message sending (requires valid credentials)
  if (!WHATSAPP_PHONE_NUMBER_ID.includes('your-') && !WHATSAPP_ACCESS_TOKEN.includes('your-')) {
    await testWhatsAppMessage();
  } else {
    log('\n⚠️  Skipping message test - credentials not configured', 'yellow');
  }

  log('\n' + '='.repeat(60), 'blue');
  log('📊 TEST COMPLETE', 'bright');
  log('='.repeat(60) + '\n', 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n✗ Test error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
