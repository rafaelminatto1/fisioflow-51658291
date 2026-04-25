import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
const token = process.env.TEST_SESSION_TOKEN;

if (!databaseUrl) {
  throw new Error("Define DATABASE_URL or NEON_DATABASE_URL before running this script.");
}

if (!token) {
  throw new Error("Define TEST_SESSION_TOKEN before running this script.");
}

const sql = neon(databaseUrl);

async function check() {
  try {
    const res = await sql`
          SELECT s."userId", u.email, u.role, p.organization_id
          FROM neon_auth.session s
          JOIN neon_auth."user" u ON s."userId" = u.id
          LEFT JOIN public.profiles p ON s."userId" = p.user_id
          WHERE s.token = ${token} AND s."expiresAt" > now()
          LIMIT 1
        `;
    console.log("Result:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
