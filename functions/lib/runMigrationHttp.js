"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrationHttp = void 0;
const https_1 = require("firebase-functions/v2/https");
const pg_1 = require("pg");
const init_1 = require("./init");
/**
 * HTTP endpoint to run migration (no auth required - temporary!)
 * DELETE THIS AFTER MIGRATION IS COMPLETE!
 *
 * Uses direct TCP connection instead of Cloud SQL socket for this one-time migration
 */
exports.runMigrationHttp = (0, https_1.onRequest)({
    secrets: ['DB_PASS'],
    memory: '256MiB',
    cors: init_1.CORS_ORIGINS,
}, async (req, res) => {
    // Simple API key check (optional security)
    const apiKey = req.query.key;
    if (apiKey !== 'temp-migration-key-2026') {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }
    // Get DB password from secret
    const dbPass = process.env.DB_PASS || 'fisioflow2024';
    // Use direct TCP connection for migration with SSL
    const pool = new pg_1.Pool({
        host: '35.192.122.198',
        port: 5432,
        user: process.env.DB_USER || 'fisioflow',
        password: dbPass,
        database: process.env.DB_NAME || 'fisioflow',
        max: 1,
        connectionTimeoutMillis: 30000,
        ssl: {
            rejectUnauthorized: false
        }
    });
    const client = await pool.connect();
    try {
        console.log('🔄 Starting organizations table migration...');
        await client.query('BEGIN');
        // Check and add slug column
        const slugCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'slug'
    `);
        if (slugCheck.rows.length === 0) {
            console.log('➕ Adding slug column to organizations table...');
            await client.query(`ALTER TABLE organizations ADD COLUMN slug TEXT`);
            await client.query(`
        UPDATE organizations
        SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9\u00C0-\u00FF\s]', '', 'g'))
        WHERE slug IS NULL
      `);
            await client.query(`CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug)`);
            console.log('✅ slug column added successfully');
        }
        else {
            console.log('ℹ️ slug column already exists - skipping');
        }
        // Check and add active column
        const activeCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'active'
    `);
        if (activeCheck.rows.length === 0) {
            console.log('➕ Adding active column to organizations table...');
            await client.query(`ALTER TABLE organizations ADD COLUMN active BOOLEAN NOT NULL DEFAULT true`);
            console.log('✅ active column added successfully');
        }
        else {
            console.log('ℹ️ active column already exists - skipping');
        }
        await client.query(`UPDATE organizations SET active = true WHERE active IS NULL`);
        await client.query('COMMIT');
        const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name IN ('slug', 'active')
      ORDER BY column_name
    `);
        console.log('✅ Migration completed successfully!');
        res.json({
            success: true,
            message: 'Migration completed successfully',
            columns: result.rows
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        res.status(500).json({
            success: false,
            error: error?.message || String(error)
        });
    }
    finally {
        client.release();
        await pool.end();
    }
});
//# sourceMappingURL=runMigrationHttp.js.map