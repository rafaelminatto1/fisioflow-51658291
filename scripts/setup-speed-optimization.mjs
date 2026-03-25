/**
 * Cloudflare Speed & Cache Optimization Setup
 * 
 * This script automates the configuration of Cloudflare Observatory and 
 * Tiered Cache as suggested in the dashboard.
 * 
 * Requirements:
 * - A Cloudflare API Token with the following permissions:
 *   - Zone.Read
 *   - Zone.Settings:Edit
 *   - Zone.Cache:Edit
 *   - Zone.Speed:Edit
 */

import 'dotenv/config';

const CF_ZONE_ID = "REDACTED"; // moocafisio.com.br
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN_ADMIN || process.env.CLOUDFLARE_API_TOKEN;
const TARGET_URL = "https://moocafisio.com.br";

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

  const data = await response.json();
  if (!data.success) {
    console.error(`❌ Error in ${endpoint}:`, JSON.stringify(data.errors));
    return null;
  }
  return data.result;
}

async function main() {
  console.log(`🚀 Starting optimization for ${TARGET_URL}...`);

  if (!CF_API_TOKEN) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN not found.');
    return;
  }

  // 1. Enable Smart Tiered Cache
  console.log('📦 Enabling Smart Tiered Cache...');
  const tieredCache = await cfApi('/cache/tiered_cache_smart_topology_enable', 'PATCH', { value: 'on' });
  if (tieredCache) console.log('✅ Smart Tiered Cache enabled!');

  // 2. Enable Smart Shield (Origin Protection)
  console.log('🛡️ Enabling Smart Shield...');
  const smartShield = await cfApi('/smart_shield', 'PATCH', { enabled: true });
  if (smartShield) console.log('✅ Smart Shield enabled!');

  // 3. Create a Recurring Test in Observatory
  console.log('📈 Creating recurring test in Observatory...');
  // Note: URL must be double-percent encoded or just handled by the POST body
  const observatoryTest = await cfApi('/speed_api/pages', 'POST', {
    url: TARGET_URL,
    frequency: 'WEEKLY' // Default for Free plan is once a week
  });
  if (observatoryTest) {
    console.log('✅ Recurring test scheduled in Observatory!');
  } else {
    // If it fails, maybe the page already exists, try to trigger a test run
    console.log('ℹ️ Attempting to trigger a manual test run...');
    const encodedUrl = encodeURIComponent(TARGET_URL);
    const triggerTest = await cfApi(`/speed_api/pages/${encodedUrl}/tests`, 'POST');
    if (triggerTest) console.log('✅ Manual test run triggered!');
  }

  console.log('✨ Optimization complete!');
}

main().catch(console.error);
