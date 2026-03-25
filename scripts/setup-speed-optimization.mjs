/**
 * Cloudflare Speed & Cache Optimization Setup - V3 (São Paulo, BR)
 * 
 * This script automates the configuration of Cloudflare Observatory and 
 * Tiered Cache, specifically triggering tests from São Paulo, Brazil.
 */

import 'dotenv/config';

const CF_ZONE_ID = "a5467f4c307c538e13154c97802788e4"; // moocafisio.com.br
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const TARGET_URL = "https://moocafisio.com.br";
const REGION = "south-america-east1"; // São Paulo, Brazil

async function cfApi(endpoint, method = 'GET', body = null) {
  const url = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    if (!data.success) {
      return { success: false, errors: data.errors };
    }
    return { success: true, result: data.result };
  } catch (e) {
    return { success: false, error: 'Non-JSON response' };
  }
}

async function main() {
  console.log(`🚀 Triggering São Paulo test for ${TARGET_URL}...`);

  if (!CF_API_TOKEN) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN not found.');
    return;
  }

  const encodedUrl = encodeURIComponent(TARGET_URL);
  
  // Trigger a test run specifically in São Paulo
  console.log(`🌍 Requesting test from region: ${REGION}...`);
  const testRun = await cfApi(`/speed_api/pages/${encodedUrl}/tests`, 'POST', {
    region: REGION
  });

  if (testRun.success) {
    console.log('✅ Observatory test run triggered in São Paulo successfully!');
    console.log(`📊 Test ID: ${testRun.result.id}`);
  } else {
    console.error('❌ Error triggering test:', JSON.stringify(testRun.errors));
    if (testRun.errors?.[0]?.code === 1002) {
      console.log('ℹ️ Tip: Free plans might have limits on regional tests or frequency.');
    }
  }

  console.log('✨ Done!');
}

main().catch(console.error);
