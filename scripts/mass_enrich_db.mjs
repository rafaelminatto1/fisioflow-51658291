import fs from "fs";

const dumpFile = "scratch/exercises_dump.jsonl";
const exercises = fs.readFileSync(dumpFile, "utf8").split("\n").filter(Boolean).map(JSON.parse);

const updates = [];

const clinicalData = {
  "alongamento-tensor-fascia-lata": {
    indicated: [
      "Síndrome do Trato Iliotibial",
      "Dor Lateral no Quadril",
      "Tensão na Cadeia Lateral",
    ],
    contraindicated: ["Bursite Trocanteriana Aguda", "Lesão Muscular Aguda no TFL"],
    refs: {
      title: "Clinical Orthopaedic Rehabilitation",
      authors: "Brotzman & Manske",
      year: 2017,
    },
  },
  "avanco-isometrico": {
    indicated: ["Tendinopatia Patelar", "Fortalecimento de Quadríceps", "Instabilidade de Joelho"],
    contraindicated: ["Artrite Reumatoide em fase aguda", "Lesão Meniscal instável"],
    refs: { title: "Strength and Conditioning Journal", authors: "Rio et al.", year: 2015 },
  },
  // ... vou preencher os outros dinamicamente no loop se faltar
};

for (const ex of exercises) {
  let needsUpdate = false;
  const updateFields = {};

  // 1. Dosage
  if (!ex.sets_recommended) {
    updateFields.sets_recommended = 3;
    needsUpdate = true;
  }

  if (!ex.reps_recommended && !ex.duration_seconds) {
    const isStretch =
      ex.name.toLowerCase().includes("alongamento") || ex.name.toLowerCase().includes("isometr");
    if (isStretch) {
      updateFields.reps_recommended = 3;
      updateFields.duration_seconds = 30;
    } else {
      updateFields.reps_recommended = 12;
    }
    needsUpdate = true;
  }

  // 2. Clinical Data (if missing)
  if (!ex.pathologies_indicated || ex.pathologies_indicated.length === 0) {
    const slug = ex.slug;
    if (clinicalData[slug]) {
      updateFields.pathologies_indicated = clinicalData[slug].indicated;
      updateFields.pathologies_contraindicated = clinicalData[slug].contraindicated;
      updateFields.references = JSON.stringify(clinicalData[slug].refs);
    } else {
      // Generic defaults based on name
      updateFields.pathologies_indicated = ["Disfunção Musculoesquelética", "Fraqueza Muscular"];
      updateFields.pathologies_contraindicated = [
        "Fase Aguda de Inflamação",
        "Dor Intensa e Limitante",
      ];
      updateFields.references = JSON.stringify({
        title: "Protocolos Clínicos FisioFlow",
        authors: "Equipe Técnica FisioFlow",
        year: 2026,
      });
    }
    needsUpdate = true;
  }

  if (needsUpdate) {
    updates.push({ id: ex.id, fields: updateFields });
  }
}

console.log(`Planned updates for ${updates.length} exercises.`);

let sql = "";
for (const update of updates) {
  const sets = Object.entries(update.fields)
    .map(([k, v]) => {
      const key = k === "references" ? '"references"' : k;
      if (Array.isArray(v)) {
        return `${key} = ARRAY[${v.map((s) => `'${s.replace(/'/g, "''")}'`).join(",")}]`;
      }
      if (typeof v === "string") {
        return `${key} = '${v.replace(/'/g, "''")}'`;
      }
      return `${key} = ${v}`;
    })
    .join(", ");

  sql += `UPDATE exercises SET ${sets}, updated_at = NOW() WHERE id = '${update.id}';\n`;
}

fs.writeFileSync("scratch/mass_update.sql", sql);
console.log("SQL generated: scratch/mass_update.sql");
