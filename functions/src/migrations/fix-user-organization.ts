/**
 * HTTP endpoint to fix user organization_id
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/fixUserOrganization?key=YOUR_API_KEY&email=user@email.com"
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getPool } from '../init';

export const fixUserOrganization = onRequest({
  secrets: ['DB_PASS', 'DB_USER', 'DB_NAME', 'CLOUD_SQL_CONNECTION_NAME', 'DB_HOST_IP_PUBLIC'],
  memory: '256MiB',
  timeoutSeconds: 60,
}, async (req, res) => {
  // Simple API key check
  const apiKey = req.query.key || req.headers['x-migration-key'];
  if (apiKey !== 'fisioflow-migration-2026') {
    res.status(403).json({ error: 'Forbidden - Invalid API key' });
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed - use POST' });
    return;
  }

  const email = req.query.email || req.body?.email;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const db = getFirestore();
  const auth = getAuth();
  const pool = getPool();

  try {
    console.log(`🔧 Fixing organization for user email: ${email}`);

    // 0. Get UID from Auth
    let uid: string;
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
      console.log(`Found UID: ${uid}`);
    } catch (e) {
      res.status(404).json({ error: 'User not found in Auth' });
      return;
    }

    // 1. Get user profile from Firestore (using UID)
    const profileRef = db.collection('profiles').doc(uid);

    // 2. Get default organization from PostgreSQL
    const orgResult = await pool.query(`
      SELECT id, name FROM organizations
      WHERE is_default = true
      LIMIT 1
    `);

    let organization: any;
    if (orgResult.rows.length === 0) {
      // Get first organization if no default is set
      const firstOrgResult = await pool.query(`
        SELECT id, name FROM organizations
        ORDER BY created_at ASC
        LIMIT 1
      `);
      if (firstOrgResult.rows.length === 0) {
        res.status(404).json({ error: 'No organization found in database' });
        return;
      }
      organization = firstOrgResult.rows[0];
    } else {
      organization = orgResult.rows[0];
    }

    console.log('Target Organization:', organization);

    // 3. Update/Create profile in Firestore
    await profileRef.set({
      organization_id: organization.id,
      organization_name: organization.name,
      email: email,
      updated_at: new Date().toISOString()
    }, { merge: true });

    // 4. Update/Create profile in PostgreSQL
    await pool.query(`
      INSERT INTO profiles (user_id, organization_id, email, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE 
      SET organization_id = $2, updated_at = NOW()
    `, [uid, organization.id, email]);

    // 5. Set Custom Claims
    await auth.setCustomUserClaims(uid, {
      organizationId: organization.id
    });

    console.log(`✅ Fixed profile for ${email} (${uid}) -> Org: ${organization.id}`);

    res.json({
      success: true,
      message: 'User organization fixed successfully',
      data: {
        uid,
        email,
        organization_id: organization.id,
        organization_name: organization.name,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ Error fixing user organization:', error);
    res.status(500).json({
      success: false,
      error: error?.message || String(error),
    });
  }
});
