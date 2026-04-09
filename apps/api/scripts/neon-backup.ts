/**
 * Automated Neon DB Backup Script
 * 
 * This script triggers a Neon Branch Snapshot via the Neon API.
 * 
 * Requirements:
 * 1. NEON_API_KEY (Neon Console > Settings > API Keys)
 * 2. NEON_PROJECT_ID (Neon Console > Project Settings)
 * 
 * Usage:
 * npx tsx scripts/neon-backup.ts
 */

const NEON_API_KEY = process.env.NEON_API_KEY;
const NEON_PROJECT_ID = process.env.NEON_PROJECT_ID;
const NEON_BRANCH_ID = process.env.NEON_BRANCH_ID || 'main';

async function triggerBackup() {
  if (!NEON_API_KEY || !NEON_PROJECT_ID) {
    console.error('❌ Error: NEON_API_KEY and NEON_PROJECT_ID must be set in Environment Variables.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotName = `Backup-Manual-${timestamp}`;

  console.log(`🚀 Triggering snapshot for project ${NEON_PROJECT_ID} on branch ${NEON_BRANCH_ID}...`);

  try {
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${NEON_BRANCH_ID}/snapshots`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NEON_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshot: {
            name: snapshotName
          }
        })
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Neon API Error: ${data.message || response.statusText}`);
    }

    console.log('✅ Snapshot created successfully!');
    console.log(`🔗 Snapshot ID: ${data.snapshot.id}`);
    console.log(`📅 Created At: ${data.snapshot.created_at}`);

  } catch (error: any) {
    console.error('❌ Failed to trigger backup:', error.message);
    process.exit(1);
  }
}

triggerBackup();
