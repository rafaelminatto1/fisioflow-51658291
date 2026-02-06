

// Load environment variables correctly

import dotenv from 'dotenv';
import path from 'path';
import { getFeatureFlagsFromEnv } from '../src/lib/featureFlags/envFlags';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock import.meta.env for the library to work in Node
(global as any).import = {
    meta: {
        env: process.env
    }
};

async function verifyFeatureFlags() {
    console.log('🚩 Verifying Feature Flags...');

    const flags = getFeatureFlagsFromEnv();
    let enabledCount = 0;

    console.log('\nCurrent Configuration:');
    Object.entries(flags).forEach(([key, value]) => {
        const status = value ? '✅ Enabled' : '❌ Disabled';
        console.log(`${status.padEnd(12)} : ${key}`);
        if (value) enabledCount++;
    });

    console.log(`\n📊 Summary: ${enabledCount} features enabled out of ${Object.keys(flags).length} total.`);

    if (enabledCount === 0) {
        console.error('❌ Warning: No features enabled. Check .env.local file.');
        process.exit(1);
    }
}

verifyFeatureFlags();
