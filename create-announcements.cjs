const fs = require("fs");
const path = require("path");

const sql = require("@neondatabase/serverless");

const DATABASE_URL = process.env.DATABASE_DIRECT_URL;

if (!DATABASE_URL) {
	console.error("DATABASE_DIRECT_URL environment variable is required");
	process.exit(1);
}

const client = sql(DATABASE_URL);


async function checkAndCreateAnnouncementsTables() {
	try {
		console.log("Checking if announcements tables exist...\n");

		// Check if tables exist
		const checkResult = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'announcement%'
      ORDER BY table_name
    `;

		console.log(
			"Tables found:",
			checkResult.map((r) => r.table_name),
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
		let announcementsSql = "";
		let foundAnnouncements = false;
		let foundAnnouncementReads = false;

		for (const statement of statements) {
			const trimmed = statement.trim();
			if (
				trimmed.includes('CREATE TABLE "announcements"') ||
				foundAnnouncements
			) {
				announcementsSql += trimmed + "\n";
				foundAnnouncements = true;
				if (trimmed.includes(";")) {
					if (foundAnnouncementReads) break;
				}
			}
			if (trimmed.includes('CREATE TABLE "announcement_reads"')) {
				foundAnnouncementReads = true;
				announcementsSql += trimmed + "\n";
			}
		}

		if (!checkResult.find((r) => r.table_name === "announcements")) {
			console.log("\n✓ Creating announcements table...");
			await client.unsafe(announcementsSql);
			console.log("✓ Announcements tables created successfully");
		} else {
			console.log("\n✓ Announcements tables already exist, skipping creation");
		}
	} catch (err) {
		console.error("\n✗ Error:", err.message);
		console.error(err.stack);
		process.exit(1);
	} finally {
		await client.end();
	}
}

checkAndCreateAnnouncementsTables();
