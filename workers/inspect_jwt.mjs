import { decodeJwt } from 'jose';

async function main() {
  const email = 'REDACTED_EMAIL';
  const password = 'REDACTED';
  const authUrl = 'https://ep-wandering-bonus-acj4zwvo.neonauth.sa-east-1.aws.neon.tech/neondb/auth';

  try {
    console.log('Authenticating...');
    const res = await fetch(`${authUrl}/sign-in/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Login failed:', res.status, errorText);
      return;
    }

    const data = await res.json();
    console.log('Login successful. Data is:', JSON.stringify(data, null, 2));
    
    // Save cookies from response
    const cookies = res.headers.get('set-cookie');
    console.log('Cookies from sign in:', cookies);
    
    const sessionToken = data.token || data.session?.token || data.bearer;
    
    // Try to call /get-session with both cookie and Bearer
    console.log('\\nCalling /get-session...');
    const sessionRes = await fetch(`${authUrl}/get-session`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:5173',
        ...(cookies ? { 'Cookie': cookies } : {}),
        ...(sessionToken ? { 'Authorization': `Bearer ${sessionToken}` } : {})
      }
    });

    console.log('Session response status:', sessionRes.status);
    console.log('Session headers:');
    sessionRes.headers.forEach((v, k) => console.log(`  ${k}: ${v}`));
    
    const sessionData = await sessionRes.text();
    console.log('Session body:', sessionData);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
