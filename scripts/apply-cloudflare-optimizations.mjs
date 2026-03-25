/**
 * Apply Cloudflare Performance Settings
 * 
 * - Rocket Loader: ON
 * - Auto Minify: HTML, CSS, JS
 * - Brotli: ON
 */

import 'dotenv/config';

const CF_ZONE_ID = "REDACTED"; // moocafisio.com.br
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function updateSetting(id, value) {
  const url = `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/${id}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });

  const data = await response.json();
  if (data.success) {
    console.log(`✅ Setting ${id} updated to:`, value);
  } else {
    console.error(`❌ Error updating ${id}:`, JSON.stringify(data.errors));
  }
}

async function main() {
  console.log('🚀 Applying Cloudflare Settings Optimization...');

  if (!CF_API_TOKEN) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN not found.');
    return;
  }

  // 1. Rocket Loader
  await updateSetting('rocket_loader', 'on');

  // 2. Auto Minify (HTML, CSS, JS)
  await updateSetting('minify', {
    html: 'on',
    css: 'on',
    js: 'on'
  });

  // 3. Brotli
  await updateSetting('brotli', 'on');

  // 4. Early Hints (Bonus for even faster FCP)
  await updateSetting('early_hints', 'on');

  console.log('✨ Cloudflare Dashboard settings applied!');
}

main().catch(console.error);
