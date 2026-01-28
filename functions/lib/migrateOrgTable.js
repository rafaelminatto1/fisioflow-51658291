const { onCall } = require('firebase-functions/v2/https');
const { getDatabase } = require('../lib/init');
const admin = require('firebase-admin');

/**
 * Temporary function to execute the organizations table migration
 * Call this from Firebase Functions shell or client
 *
 * Usage:
 * firebase functions:shell
 * > migrateOrgTable()
 */
exports.migrateOrgTable = onCall(async (request) => {
  // Verify authentication (admin only)
  if (request.auth?.token?.role !== 'admin') {
    throw new https.HttpsError('permission-denied', 'Admin access required');
  }

  const pool = getDatabase();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Add slug column
    const slugExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'slug'
      )
    `);

    if (!slugExists.rows[0].exists) {
      console.log('Adding slug column...');

      await client.query(`ALTER TABLE organizations ADD COLUMN slug TEXT`);

      await client.query(`
        UPDATE organizations
        SET slug = LOWER(REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(name, '[^a-zA-Z0-9\u00C0-\u00FF\s]', '', 'g'),
            '\s+', '-', 'g'
          ),
          '-+', '-', 'g'
        ))
        WHERE slug IS NULL
      `);

      await client.query(`CREATE INDEX idx_organizations_slug ON organizations(slug)`);

      try {
        await client.query(`ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug)`);
      } catch (err) {
        if (err.code === '23505') { // unique_violation
          await client.query(`
            WITH duplicates AS (
              SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
              FROM organizations
              WHERE slug IN (
                SELECT slug FROM organizations GROUP BY slug HAVING COUNT(*) > 1
              )
            )
            UPDATE organizations o
            SET slug = d.slug || '-' || SUBSTRING(o.id::TEXT, 1, 8)
            FROM duplicates d
            WHERE o.id = d.id AND d.rn > 1
          `);
          await client.query(`ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug)`);
        } else {
          throw err;
        }
      }

      console.log('✅ slug column added');
    } else {
      console.log('ℹ️ slug column already exists');
    }

    // Add active column
    const activeExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organizations' AND column_name = 'active'
      )
    `);

    if (!activeExists.rows[0].exists) {
      console.log('Adding active column...');
      await client.query(`ALTER TABLE organizations ADD COLUMN active BOOLEAN NOT NULL DEFAULT true`);
      console.log('✅ active column added');
    } else {
      console.log('ℹ️ active column already exists');
    }

    await client.query(`UPDATE organizations SET active = true WHERE active IS NULL`);

    await client.query('COMMIT');

    // Verify results
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name IN ('slug', 'active')
      ORDER BY column_name
    `);

    return {
      success: true,
      message: 'Migration completed successfully',
      columns: result.rows
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw new https.HttpsError('internal', error.message);
  } finally {
    client.release();
  }
});
