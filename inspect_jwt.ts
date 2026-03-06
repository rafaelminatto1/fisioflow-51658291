import { SignJWT, decodeJwt } from 'jose';

async function main() {
  const email = 'REDACTED_EMAIL';
  const password = 'REDACTED';
  const authUrl = 'https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth/sign-in/email';

  try {
    console.log('Authenticating...');
    const res = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Login failed:', res.status, errorText);
      return;
    }

    const data = await res.json();
    console.log('Login successful.');
    
    // Usually the token is in data.token or data.session.token depending on Better Auth
    const token = data.token || data.bearer || data.session?.token || data.session?.id || data.accessToken;
    
    if (!token) {
        console.log('Could not find token in response. Response keys:', Object.keys(data));
        console.log(JSON.stringify(data, null, 2));
        return;
    }

    console.log('\\n--- JWT ---');
    console.log(token);
    
    console.log('\\n--- Decoded Payload ---');
    const payload = decodeJwt(token);
    console.log(JSON.stringify(payload, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
