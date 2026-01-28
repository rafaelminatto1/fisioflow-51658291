#!/usr/bin/env node

/**
 * Run the organizations table migration via Firebase Functions
 * Uses gcloud to get auth token and calls the function
 */

import { execSync } from 'child_process';
import https from 'https';

async function getAuthToken() {
  try {
    const token = execSync('gcloud auth print-identity-token', { encoding: 'utf-8' }).trim();
    return token;
  } catch (error) {
    console.error('Failed to get auth token:', error.message);
    throw error;
  }
}

async function callMigrationFunction() {
  console.log('🔄 Calling runMigration function...\n');

  const token = await getAuthToken();

  const options = {
    hostname: 'us-central1-fisioflow-migration.cloudfunctions.net',
    path: '/runMigration',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ data: {} }));
    req.end();
  });
}

async function main() {
  try {
    const result = await callMigrationFunction();
    console.log('✅ Migration completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
