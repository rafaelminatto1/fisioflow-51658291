import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  const ids = [
    '35f7e87c-9f11-4563-92da-4c731f54ca64',
    'b794e5fc-c09d-494c-b7f0-d164ef679a79',
    'df2b7622-f98c-46bb-bd19-fa4ec1f597d5',
    '4296f246-09e2-448f-bfd5-b73300dcd3a0',
    '85757c1a-1f4a-46c0-adea-f1d389f00cfd'
  ];
  console.log("Cancelling 5 overlapping appointments...");
  try {
    await sql`UPDATE appointments SET status = 'cancelled' WHERE id = ANY(${ids})`;
    console.log("Done.");
  } catch (err) {
    console.error(err);
  }
}
run();
