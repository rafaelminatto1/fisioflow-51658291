const { GoogleAuth } = require('google-auth-library');

async function updateRecaptchaDomains() {
  const auth = new GoogleAuth({
    keyFilename: '/home/rafael/antigravity/fisioflow/fisioflow-51658291/functions/service-account-key.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const authClient = await auth.getClient();
  const accessToken = authClient.credentials.access_token;

  console.log('Checking current reCAPTCHA Enterprise configuration...');
  console.log('Project: fisioflow-migration');
  console.log('Key: 6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT\n');

  // Get current key configuration
  const response = await fetch('https://recaptchaenterprise.googleapis.com/v1/projects/412418905255/keys/6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mwxv74lT', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Current allowed domains:');
    if (data.allowedDomains && data.allowedDomains.length > 0) {
      data.allowedDomains.forEach(domain => {
        console.log(`  - ${domain}`);
      });
    } else {
      console.log('  (no domains configured)');
    }

    // Check if production domain is already there
    const hasProductionDomain = data.allowedDomains &&
      data.allowedDomains.includes('fisioflow-migration.web.app');

    if (hasProductionDomain) {
      console.log('\n✅ Production domain fisioflow-migration.web.app is already configured!');
    } else {
      console.log('\n⚠️  Production domain fisioflow-migration.web.app is NOT in allowed domains');
      console.log('Current configuration:');
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.error('Failed to get key configuration:', response.status);
    console.error('Response:', await response.text());
  }
}

updateRecaptchaDomains().then(() => process.exit(0));
