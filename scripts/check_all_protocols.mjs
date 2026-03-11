import { neon } from '@neondatabase/serverless';

const sql = neon("postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require");

async function run() {
  try {
    const protocols = await sql`
      SELECT id, name, phases, milestones, restrictions
      FROM exercise_protocols
    `;
    
    console.log(`Total protocols: ${protocols.length}`);
    
    const incompleteProtocols = protocols.filter(p => {
      return !p.phases || p.phases.length === 0 || Object.keys(p.phases).length === 0 ||
             !p.milestones || p.milestones.length === 0 || Object.keys(p.milestones).length === 0 ||
             !p.restrictions || p.restrictions.length === 0 || Object.keys(p.restrictions).length === 0;
    });

    console.log(`\nIncomplete protocols: ${incompleteProtocols.length}`);
    incompleteProtocols.forEach(p => {
      console.log(`- ${p.name}`);
      if (!p.phases || p.phases.length === 0 || Object.keys(p.phases).length === 0) console.log('  Missing: phases');
      if (!p.milestones || p.milestones.length === 0 || Object.keys(p.milestones).length === 0) console.log('  Missing: milestones');
      if (!p.restrictions || p.restrictions.length === 0 || Object.keys(p.restrictions).length === 0) console.log('  Missing: restrictions');
    });
  } catch (err) {
    console.error(err);
  }
}

run();
