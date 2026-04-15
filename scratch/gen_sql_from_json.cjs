const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scratch/placeholder_data.json', 'utf8'));
let sql = '';
data.forEach(e => {
  const formatArray = (arr) => {
    if (!arr || arr.length === 0) return 'ARRAY[]::text[]';
    return "ARRAY[" + arr.map(i => "$$" + i + "$$").join(", ") + "]";
  };

  sql += "UPDATE exercises SET " +
    "description = $$" + e.description + "$$, " +
    "instructions = $$" + e.instructions + "$$, " +
    "tips = $$" + e.tips.join("\n") + "$$, " +
    "precautions = $$" + e.precautions.join("\n") + "$$, " +
    "benefits = $$" + e.benefits.join("\n") + "$$, " +
    "body_parts = " + formatArray(e.body_parts) + ", " +
    "equipment = " + formatArray(e.equipment) + ", " +
    "muscles_primary = " + formatArray(e.muscles) + " " +
    "WHERE id = '" + e.id + "';\n";
});
fs.writeFileSync('tmp/batch_placeholders.sql', sql);
console.log('SQL generated.');
