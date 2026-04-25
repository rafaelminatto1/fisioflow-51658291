import { Pool } from "pg";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.build") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addColumn() {
  try {
    console.log("Adding session_value column to patients table...");
    await pool.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS session_value numeric(10, 2);
    `);
    console.log("Successfully added session_value column.");
  } catch (error) {
    console.error("Error adding column:", error);
  } finally {
    await pool.end();
  }
}

addColumn();
