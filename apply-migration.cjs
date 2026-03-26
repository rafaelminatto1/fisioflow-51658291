

const postgres = require("postgres");
const fs = require("fs");
const path = require("path");

const DATABASE_URL =
	process.env.DATABASE_URL || process.env.DATABASE_DIRECT_URL;

if (!DATABASE_URL) {
	console.error(
		"DATABASE_URL or DATABASE_DIRECT_URL environment variable is required",
	);
	process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });

const migrationsFolder = path.join(__dirname, "drizzle");
const migrationFiles = fs
	.readdirSync(migrationsFolder)
	.filter((f) => f.endsWith(".sql"))
	.filter((f) => f !== "0000_overjoyed_gorgon.sql") // Skip the announcements migration for now
	.sort();

console.log(`Found ${migrationFiles.length} migration files`);

async function applyMigrations() {
	try {
		for (const file of migrationFiles) {
			console.log(`Applying migration: ${file}`);
			const migrationSql = fs.readFileSync(
				path.join(migrationsFolder, file),
				"utf8",
			);

			const statements = migrationSql.split("--> statement-breakpoint");
			for (const statement of statements) {
				if (statement.trim()) {
					try {
						await sql.unsafe(statement.trim());
						console.log(`  ✓ Executed statement`);
					} catch (err) {
						console.error(`  ✗ Error executing statement: ${err.message}`);
						console.error(`     Statement: ${statement.substring(0, 100)}...`);
						throw err;
					}
				}
			}
		}

		console.log("\n✓ All migrations applied successfully");
	} catch (err) {
		console.error("\n✗ Migration failed:", err.message);
		process.exit(1);
	} finally {
		await sql.end();
	}
}

applyMigrations();
