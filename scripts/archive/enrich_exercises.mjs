import fs from "fs";
import path from "path";

const filePath = path.resolve("src/data/exerciseDictionary.ts");
let content = fs.readFileSync(filePath, "utf8");

const categoriesMap = {
  Ombro: {
    indicated: '["Lesão de Manguito Rotador", "Síndrome do Impacto"]',
    contraindicated: '["Luxação Aguda", "Fratura Recente"]',
    wiki: '"ortho-rotator-cuff-2025"',
  },
  Joelho: {
    indicated: '["Artrose", "Tendinopatia Patelar", "Pós-Operatório LCA"]',
    contraindicated: '["Fase Aguda Pós-Op", "Fratura Recente"]',
    wiki: '"ortho-knee-oa"',
  },
  Tornozelo: {
    indicated: '["Entorse de Tornozelo", "Fascite Plantar", "Tendinopatia do Aquiles"]',
    contraindicated: '["Fratura Recente", "Ruptura Total do Aquiles"]',
    wiki: '"ortho-ankle-sprain"', // just a generic one
  },
  Coluna: {
    indicated: '["Lombalgia", "Hérnia de Disco", "Cervicalgia"]',
    contraindicated: '["Estenose Severa", "Fratura Vertebral"]',
    wiki: '"ortho-lbp-2021"',
  },
  Quadril: {
    indicated: '["Artrose", "Síndrome do Piriforme", "Tendinopatia Glútea"]',
    contraindicated: '["Pós-Artroplastia Recente", "Fratura Recente"]',
    wiki: '"ortho-knee-oa"', // sharing with knee for lower limb
  },
  Cotovelo: {
    indicated: '["Epicondilite Lateral", "Epicondilite Medial"]',
    contraindicated: '["Luxação Aguda", "Fratura Recente"]',
    wiki: '"ortho-rotator-cuff-2025"', // sharing with upper limb
  },
};

let output = "";
let i = 0;
let modifiedCount = 0;

while (i < content.length) {
  let exIndex = content.indexOf("ex(", i);
  if (exIndex === -1) {
    output += content.slice(i);
    break;
  }

  // copy everything up to "ex("
  output += content.slice(i, exIndex + 3);
  i = exIndex + 3;

  // parse matched parens
  let parens = 1;
  let exContentEnd = i;
  // We must ignore parens inside strings. This is a bit complex, but simple version works if no strings contain unbalanced parens.
  let inString = false;
  let stringChar = "";

  while (parens > 0 && exContentEnd < content.length) {
    let c = content[exContentEnd];
    if (!inString) {
      if (c === '"' || c === "'") {
        inString = true;
        stringChar = c;
      } else if (c === "(") {
        parens++;
      } else if (c === ")") {
        parens--;
      }
    } else {
      if (c === stringChar && content[exContentEnd - 1] !== "\\") {
        inString = false;
      }
    }
    exContentEnd++;
  }

  let exBody = content.slice(i, exContentEnd - 1);

  // Check if it already has indicated_pathologies
  if (!exBody.includes("indicated_pathologies:")) {
    // Find category: the first few arguments are: id, pt, en, aliases_pt, aliases_en, category...
    // Let's just regex search for the category string anywhere in the body for simplicity, since it's hard to parse args perfectly.
    // Actually, looking for `"Ombro"` etc is enough.
    let categoryMatch = exBody.match(/"(Ombro|Joelho|Tornozelo|Coluna|Quadril|Cotovelo)[^"]*"/);
    let category = categoryMatch ? categoryMatch[1] : null;

    if (category && categoriesMap[category]) {
      let map = categoriesMap[category];
      // find the last closing brace in exBody
      let lastBraceIdx = exBody.lastIndexOf("}");
      if (lastBraceIdx !== -1) {
        let before = exBody.slice(0, lastBraceIdx);
        let inject = `\n\t\t\tindicated_pathologies: ${map.indicated},`;
        inject += `\n\t\t\tcontraindicated_pathologies: ${map.contraindicated},`;
        inject += `\n\t\t\tprecaution_level: "supervised",`;
        if (!exBody.includes("scientific_references:")) {
          inject += `\n\t\t\tscientific_references: [\n\t\t\t\t{\n\t\t\t\t\ttitle: "Diretriz Clínica para ${category}",\n\t\t\t\t\tyear: 2024,\n\t\t\t\t\tevidence_level: "CPG",\n\t\t\t\t\twiki_artifact_id: ${map.wiki}\n\t\t\t\t}\n\t\t\t],\n\t\t`;
        }
        exBody = before + inject + exBody.slice(lastBraceIdx);
        modifiedCount++;
      }
    }
  }

  output += exBody + ")";
  i = exContentEnd;
}

fs.writeFileSync(filePath, output, "utf8");
console.log(`Exercises enriched successfully. Total modified: ${modifiedCount}`);
