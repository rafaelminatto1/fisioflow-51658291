const fs = require("fs");
const path = require("path");

// Read production env
const envContent = fs.readFileSync(".env.production", "utf8");
const dbUrl = envContent.match(/^DATABASE_DIRECT_URL=(.+)$/m)?.[1];

if (!dbUrl) {
	console.error("DATABASE_DIRECT_URL not found in .env.production");
	process.exit(1);
}

const { Pool } = require("pg");

const pool = new Pool({ connectionString: dbUrl });

async function createAnnouncementsTables() {
	const client = await pool.connect();
	try {
		console.log("Checking if announcements tables exist...\n");

		// Check if tables exist
		const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'announcement%'
      ORDER BY table_name
    `);

		console.log(
			"Tables found:",
			checkResult.rows.map((r) => r.table_name),
		);

		// Read migration file
		const migrationPath = path.join(
			__dirname,
			"drizzle",
			"0000_overjoyed_gorgon.sql",
		);
		const migrationSql = fs.readFileSync(migrationPath, "utf8");

		// Extract only announcements tables SQL
		const statements = migrationSql.split("--> statement-breakpoint");
		const announcementsSql = [];
		let foundAnnouncements = false;
		let foundAnnouncementReads = false;

		for (const statement of statements) {
			const trimmed = statement.trim();
			if (
				trimmed.includes('CREATE TABLE "announcements"') ||
				foundAnnouncements
			) {
				announcementsSql.push(trimmed);
				foundAnnouncements = true;
				if (trimmed.includes(";") && foundAnnouncementReads) {
					break;
				}
			}
			if (trimmed.includes('CREATE TABLE "announcement_reads"')) {
				foundAnnouncementReads = true;
				announcementsSql.push(trimmed);
			}
		}

		if (announcementsSql.length > 0) {
			if (!checkResult.rows.find((r) => r.table_name === "announcements")) {
				console.log("\n✓ Creating announcements tables...\n");
				for (const sql of announcementsSql) {
					console.log("  Executing:", sql.substring(0, 80) + "...");
					await client.query(sql);
				}
				console.log("\n✓ Announcements tables created successfully");
			} else {
				console.log(
					"\n✓ Announcements tables already exist, skipping creation",
				);
			}
		} else {
			console.error(
				"✗ Could not find announcements table creation SQL in migration",
			);
		}
	} catch (err) {
		console.error("\n✗ Error:", err.message);
		console.error(err.stack);
		process.exit(1);
	} finally {
		await client.release();
		await pool.end();
	}
}

createAnnouncementsTables();
