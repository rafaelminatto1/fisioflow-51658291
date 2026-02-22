import fs from 'fs';

async function testApi() {
    const apiKey = 'AIzaSyCz2c3HvQoV7RvFCbCaudbEEelEQaO-tY8';
    const email = 'rafael.minatto@yahoo.com.br';
    const password = 'Yukari30@';

    console.log('1. Authenticating with Firebase...');
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    if (!authRes.ok) {
        console.error('Auth failed', await authRes.text());
        return;
    }
    const authData = await authRes.json();
    const token = authData.idToken;
    console.log('Auth success. UID:', authData.localId);

    const urlsToTest = [
        'https://listappointments-tfecm5cqoq-rj.a.run.app/',
        'https://southamerica-east1-fisioflow-migration.cloudfunctions.net/listAppointments'
    ];

    for (const url of urlsToTest) {
        console.log(`\n2. Fetching ${url} ...`);
        try {
            const apiRes = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        limit: 50,
                        dateFrom: "2026-02-15",
                        dateTo: "2026-02-28"
                    }
                })
            });

            console.log('API Status:', apiRes.status, apiRes.statusText);
            if (!apiRes.ok) {
                console.error('API Error:', await apiRes.text());
                continue;
            }

            const data = await apiRes.json();
            console.log('API Response keys:', Object.keys(data));
            const items = data.data || data.result?.data || [];
            console.log('Data payload length:', items.length);
            if (items.length > 0) {
                console.log('Sample item:', items[0]);
            } else {
                console.log('No appointments returned.');
            }
            return; // Success, stop trying URLs
        } catch (err) {
            console.error(`Error fetching ${url}:`, err.message);
        }
    }
}

testApi().catch(console.error);
