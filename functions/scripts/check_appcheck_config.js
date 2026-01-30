const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function configureAppCheck() {
  try {
    console.log('Configuring Firebase App Check for production...');

    // App Check configuration via REST API
    const projectId = 'fisioflow-migration';
    const appId = '1:412418905255:web:07bc8e405b6f5c1e597782';

    // Get access token
    const client = await admin.credential.applicationDefault().getAccessToken();
    const accessToken = client.access_token;

    // Configure App Check app
    const appCheckUrl = `https://firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps/${appId}`;

    // First, let's try to get the current app configuration
    console.log('Checking current App Check configuration...');

    const response = await fetch(`${appCheckUrl}?access_token=${accessToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Current App Check configuration:', JSON.stringify(data, null, 2));

      if (data.name) {
        console.log('✅ App Check app is already configured');
        console.log('App name:', data.name);
        console.log('App ID:', data.appId);
        if (data.recaptchaEnterpriseKey) {
          console.log('reCAPTCHA key:', data.recaptchaEnterpriseKey);
        }
      } else {
        console.log('⚠️ App Check app exists but may not be fully configured');
      }
    } else {
      console.log('Response status:', response.status);
      console.log('Response:', await response.text());
    }

    // List all App Check apps for the project
    console.log('\nListing all App Check apps...');

    const listUrl = `https://firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps`;
    const listResponse = await fetch(`${listUrl}?access_token=${accessToken}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('All App Check apps:', JSON.stringify(listData, null, 2));

      if (listData.apps && listData.apps.length > 0) {
        console.log(`\nFound ${listData.apps.length} App Check app(s):`);
        listData.apps.forEach((app, index) => {
          console.log(`${index + 1}. App ID: ${app.appId}`);
          console.log(`   Name: ${app.name || '(no name)'}`);
          console.log(`   App Type: ${app.appType}`);
          console.log('');
        });
      }
    } else {
      console.log('Failed to list apps:', listResponse.status);
      console.log('Response:', await listResponse.text());
    }

  } catch (error) {
    console.error('Error configuring App Check:', error);
  }
}

configureAppCheck().then(() => process.exit(0));
