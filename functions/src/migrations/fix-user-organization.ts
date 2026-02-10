/**
 * HTTP endpoint to fix user organization_id
 *
 * Usage: curl -X POST "https://REGION-PROJECT.cloudfunctions.net/fixUserOrganization?key=YOUR_API_KEY&email=user@email.com"
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
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
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const db = getFirestore();
  const pool = getPool();

  try {
    console.log(`🔧 Fixing organization for user: ${email}`);

    // 1. Get user profile from Firestore
    const profileDoc = await db.collection('profiles').doc(email.replace(/\./g, ',')).get();
    if (!profileDoc.exists) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    const profile = profileDoc.data();
    console.log('Profile:', { id: profileDoc.id, organization_id: profile?.organization_id });

    // 2. Get default organization from PostgreSQL
    const orgResult = await pool.query(`
      SELECT id, name FROM organizations
      WHERE is_default = true
      LIMIT 1
    `);

    if (orgResult.rows.length === 0) {
      // Get first organization if no default is set
      const firstOrgResult = await pool.query(`
        SELECT id, name FROM organizations
        ORDER BY created_at ASC
        LIMIT 1
      `);
      if (firstOrgResult.rows.length === 0) {
        res.status(404).json({ error: 'No organization found' });
        return;
      }
      var organization = firstOrgResult.rows[0];
    } else {
      var organization = orgResult.rows[0];
    }

    console.log('Organization:', organization);

    // 3. Update profile in Firestore with organization_id
    await db.collection('profiles').doc(email.replace(/\./g, ',')).update({
      organization_id: organization.id,
      organization_name: organization.name,
    });

    console.log(`✅ Updated profile ${email} with organization ${organization.id}`);

    res.json({
      success: true,
      message: 'User organization fixed successfully',
      data: {
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
