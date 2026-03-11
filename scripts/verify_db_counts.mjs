import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const protocols = await sql`SELECT id, name, milestones, restrictions FROM exercise_protocols`;
    console.log(`Total protocols found: ${protocols.length}`);
    protocols.forEach(p => {
      const milestones = typeof p.milestones === "string" ? JSON.parse(p.milestones) : (p.milestones || []);
      const restrictions = typeof p.restrictions === "string" ? JSON.parse(p.restrictions) : (p.restrictions || []);
      console.log(`- ${p.name}: ${milestones.length} milestones, ${restrictions.length} restrictions`);
    });
  } catch (err) {
    console.error("Error checking database:", err);
  }
}

check();
