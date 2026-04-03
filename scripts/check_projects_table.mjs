import { neon } from "@neondatabase/serverless";

const connectionstring =
	"postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionstring);

async function checkTables() {
	try {
		console.log("Checking tables in database...\n");

		const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

		console.log("Tables in database:");
		tables.forEach((table) => {
			console.log(`  - ${table.table_name}`);
		});

		console.log("\nChecking if projects table exists...");
		const projectsCount =
			await sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public'`;
		console.log(
			`Projects table exists: ${projectsCount[0].count > 0 ? "✅" : "❌"}`,
		);

		if (projectsCount[0].count > 0) {
			const projectsColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'projects' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
			console.log("\nProjects table structure:");
			projectsColumns.forEach((col) => {
				console.log(
					`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`,
				);
			});

			const projectsData = await sql`SELECT COUNT(*) as count FROM projects`;
			console.log(`\nProjects count: ${projectsData[0].count}`);
		}

		console.log("\nChecking if boards table exists...");
		const boardsCount =
			await sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'boards' AND table_schema = 'public'`;
		console.log(
			`Boards table exists: ${boardsCount[0].count > 0 ? "✅" : "❌"}`,
		);
	} catch (error) {
		console.error("Error checking tables:", error);
	}
}

checkTables()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
