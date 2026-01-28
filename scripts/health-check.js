const https = require('https');
const { URL } = require('url');

const CONFIG = {
    endpoints: [
        { name: 'Frontend', url: 'https://fisioflow-migration.web.app' },
        { name: 'API Health', url: 'https://us-central1-fisioflow-migration.cloudfunctions.net/healthCheck' }
    ],
    timeout: 5000
};

async function checkEndpoint(endpoint) {
    return new Promise((resolve) => {
        const start = Date.now();
        const req = https.get(endpoint.url, { timeout: CONFIG.timeout }, (res) => {
            const duration = Date.now() - start;
            if (res.statusCode >= 200 && res.statusCode < 400) {
                console.log(`✅ ${endpoint.name}: OK (${res.statusCode}) - ${duration}ms`);
                resolve(true);
            } else {
                console.error(`❌ ${endpoint.name}: FAILED (${res.statusCode}) - ${endpoint.url}`);
                resolve(false);
            }
        });

        req.on('error', (err) => {
            console.error(`❌ ${endpoint.name}: ERROR - ${err.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            req.destroy();
            console.error(`❌ ${endpoint.name}: TIMEOUT (> ${CONFIG.timeout}ms)`);
            resolve(false);
        });
    });
}

async function run() {
    console.log('🏥 Starting FisioFlow Health Check...\n');

    const results = await Promise.all(CONFIG.endpoints.map(checkEndpoint));
    const success = results.every(r => r);

    console.log('\n----------------------------------------');
    if (success) {
        console.log('✨ All systems GO! Deployment looks healthy.');
        process.exit(0);
    } else {
        console.error('⚠️  Some checks failed. Investigate immediately.');
        process.exit(1);
    }
}

run();
