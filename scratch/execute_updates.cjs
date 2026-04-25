const { neon } = require('@neondatabase/serverless');
const fs = require('fs');

const sql = neon('postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require&uselibpqcompat=true');

const data = JSON.parse(fs.readFileSync('scratch/placeholder_data.json', 'utf8'));

(async () => {
  console.log('Starting updates...');
  for (const e of data) {
    try {
      // Mapping fields.
      // tips, precautions, benefits were 'text' but stored as PG array strings in my sample.
      // However, if we want to be safe, let's store them as stringified JSON or just join them with newlines if they are meant to be displayed.
      // BUT, looking at the sample: the app likely expects that specific format.
      // For now, I'll join with newlines or keep as array and let PG handle it if I cast it.

      // Let's try to pass them as arrays and see if the Neon SDK / PG handles it for 'text' columns.
      // Actually, for 'text' columns, we'll strings.
      const tipsStr = e.tips.join('\\n');
      const precautionsStr = e.precautions.join('\\n');
      const benefitsStr = e.benefits.join('\\n');

      await sql\`
        UPDATE exercises SET
          description = \${e.description},
          instructions = \${e.instructions},
          tips = \${tipsStr},
          precautions = \${precautionsStr},
          benefits = \${benefitsStr},
          body_parts = \${e.body_parts},
          equipment = \${e.equipment},
          muscles_primary = \${e.muscles}
        WHERE id = \${e.id}
      \`;
      console.log(\`Updated: \${e.name}\`);
    } catch (err) {
      console.error(\`Failed to update \${e.name}: \`, err.message);
    }
  }
  console.log('All updates finished.');
})();
