const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('/home/rafael/antigravity/fisioflow/fisioflow-51658291/functions/service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAppCheckApp() {
  try {
    console.log('Creating Firebase App Check app for production...');

    const projectId = 'fisioflow-migration';
    const appId = '1:412418905255:web:07bc8e405b6f5c1e597782';
    const siteKey = '6LcTJVksAAAAACRBNy4BxFyvTWduSZq3Mmxv74lT';

    // Get access token
    const client = await admin.credential.applicationDefault().getAccessToken();
    const accessToken = client.access_token;

    // Create App Check app
    const appCheckUrl = `https://firebaseappcheck.googleapis.com/v1/projects/${projectId}/apps`;

    console.log('Creating App Check app with:');
    console.log('  App ID:', appId);
    console.log('  Site Key:', siteKey);

    const response = await fetch(`${appCheckUrl}?access_token=${accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        appId: appId,
        displayName: 'FisioFlow Production Web',
        siteKey: siteKey,
        provider: 'recaptchaEnterprise'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ App Check app created successfully!');
      console.log('App name:', data.name);
      console.log('App ID:', data.appId);
      console.log('Site Key:', data.recaptchaEnterpriseKey);

      // Extract the app name for token registration
      if (data.name) {
        console.log('\n📝 App Name for token registration:', data.name);

        console.log('\nNext steps:');
        console.log('1. The App Check app is now configured');
        console.log('2. reCAPTCHA Enterprise key is linked');
        console.log('3. Token exchange should now work');
        console.log('\nTest by refreshing the production page!');
      }
    } else {
      console.error('Failed to create App Check app:');
      console.error('Status:', response.status);
      console.error('Response:', await response.text());
    }

  } catch (error) {
    console.error('Error creating App Check app:', error);
  }
}

createAppCheckApp().then(() => process.exit(0));
