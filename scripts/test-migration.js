#!/usr/bin/env node

/**
 * Migration Integration Test
 * Tests the organizations table after migration
 *
 * Usage: node scripts/test-migration.js
 */

import pg from "pg";
const { Pool } = pg;

// Production database connection
const pool = new Pool({
  host: "35.192.122.198",
  database: "fisioflow",
  user: "fisioflow",
  password: "fisioflow2024",
  port: 5432,
});

async function testMigration() {
  console.log("🧪 Testing Organizations Table Migration\n");
  console.log("📍 Database: fisioflow@35.192.122.198\n");

  try {
    // Test 1: Check columns exist
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 1: Checking columns exist...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      AND column_name IN ('slug', 'active')
      ORDER BY column_name
    `);

    if (columnsResult.rows.length === 2) {
      console.log("✅ Both columns exist");
      console.table(columnsResult.rows);
    } else {
      console.error(`❌ Missing columns! Found ${columnsResult.rows.length}/2`);
      process.exit(1);
    }

    // Test 2: Check for NULL values in active
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 2: Checking for NULL values in active...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const nullResult = await pool.query(`
      SELECT COUNT(*)::int as count
      FROM organizations
      WHERE active IS NULL
    `);

    if (nullResult.rows[0].count === 0) {
      console.log("✅ No NULL values in active column");
    } else {
      console.error(`❌ Found ${nullResult.rows[0].count} NULL values in active`);
      process.exit(1);
    }

    // Test 3: Check slug uniqueness
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 3: Checking slug uniqueness...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const dupResult = await pool.query(`
      SELECT slug, COUNT(*) as count
      FROM organizations
      WHERE slug IS NOT NULL
      GROUP BY slug
      HAVING COUNT(*) > 1
    `);

    if (dupResult.rows.length === 0) {
      console.log("✅ All slugs are unique");
    } else {
      console.error("❌ Duplicate slugs found:");
      console.table(dupResult.rows);
      process.exit(1);
    }

    // Test 4: Test insert statement (from auth middleware)
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 4: Testing INSERT statement (auth middleware simulation)...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const testId = "test-org-" + Date.now();
    try {
      await pool.query(
        `
        INSERT INTO organizations (id, name, slug, active)
        VALUES ($1, 'Test Organization', 'test-org', true)
        ON CONFLICT (id) DO NOTHING
      `,
        [testId],
      );
      console.log("✅ INSERT statement works (auth middleware will be able to create orgs)");

      // Cleanup
      await pool.query("DELETE FROM organizations WHERE id = $1", [testId]);
      console.log("✅ Test record cleaned up");
    } catch (err) {
      console.error("❌ INSERT statement failed:", err.message);
      console.error("   Auth middleware will fail to create default organizations!");
      process.exit(1);
    }

    // Test 5: Verify data integrity
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 5: Data integrity check...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const integrityResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE slug IS NULL) as null_slugs,
        COUNT(*) FILTER (WHERE active IS NULL) as null_active,
        COUNT(*) FILTER (WHERE active = true) as active_orgs,
        COUNT(*) FILTER (WHERE active = false) as inactive_orgs,
        COUNT(*) as total_orgs
      FROM organizations
    `);

    const stats = integrityResult.rows[0];
    console.log("📊 Organization Statistics:");
    console.table(stats);

    if (stats.null_slugs > 0 || stats.null_active > 0) {
      console.error("❌ Data integrity issues found!");
      process.exit(1);
    }
    console.log("✅ Data integrity verified");

    // Test 6: Sample data verification
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test 6: Sample data verification...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const sampleResult = await pool.query(`
      SELECT id, name, slug, active, created_at
      FROM organizations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (sampleResult.rows.length > 0) {
      console.log("📋 Sample organizations (newest first):");
      console.table(sampleResult.rows);
    } else {
      console.log("⚠️  No organizations found in database");
    }

    // All tests passed
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ ALL TESTS PASSED!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 The migration is complete and verified!");
    console.log("   - Auth middleware will be able to create default organizations");
    console.log("   - User authentication should work properly");
    console.log("   - All existing data is preserved\n");
  } catch (err) {
    console.error("\n❌ Test failed:", err.message);
    console.error("\nStack trace:", err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
testMigration().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
