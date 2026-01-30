"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = void 0;
const https_1 = require("firebase-functions/v2/https");
const init_1 = require("./init");
/**
 * Run organizations table migration
 * Adds slug and active columns to organizations table
 *
 * Usage from Firebase Functions shell:
 * const data = await runMigration({ data: null });
 */
exports.runMigration = (0, https_1.onCall)({ cors: true }, async (request) => {
    const pool = (0, init_1.getPool)();
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
            // Generate slugs from existing names
            await client.query(`
        UPDATE organizations
        SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9\u00C0-\u00FF\s]', '', 'g'))
        WHERE slug IS NULL
      `);
            // Create index
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
        // Update any NULL values
        await client.query(`UPDATE organizations SET active = true WHERE active IS NULL`);
        await client.query('COMMIT');
        // Verify results
        const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name IN ('slug', 'active')
      ORDER BY column_name
    `);
        console.log('✅ Migration completed successfully!');
        return {
            success: true,
            message: 'Migration completed successfully',
            columns: result.rows
        };
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw new Error(`Migration failed: ${error?.message || String(error)}`);
    }
    finally {
        client.release();
    }
});
//# sourceMappingURL=runMigration.js.map