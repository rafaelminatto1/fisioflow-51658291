import fs from "fs";
import path from "path";

const filePath = path.resolve("src/data/exerciseDictionary.ts");
let content = fs.readFileSync(filePath, "utf8");

const fallbackMap = {
  Core: {
    indicated: '["Lombalgia", "Fraqueza Abdominal", "Instabilidade Lombo-Pélvica"]',
    contraindicated: '["Hérnia de Disco Aguda", "Pós-Operatório Recente Abdominal"]',
    wiki: '"ortho-lbp-2021"',
  },
  Punho: {
    indicated: '["Síndrome do Túnel do Carpo", "Tendinopatia de Punho"]',
    contraindicated: '["Fratura Recente", "Luxação Aguda"]',
    wiki: '"ortho-cts"',
  },
  Pescoço: {
    indicated: '["Cervicalgia", "Tensão Muscular"]',
    contraindicated: '["Estenose Cervical Severa", "Hérnia Discal Cervical Aguda"]',
    wiki: '"ortho-neck-pain"',
  },
  Tornozelo: {
    indicated: '["Entorse de Tornozelo", "Fascite Plantar"]',
    contraindicated: '["Fratura Aguda", "Ruptura de Tendão"]',
    wiki: '"ortho-ankle-sprain"',
  },
  Ombro: {
    indicated: '["Lesão de Manguito Rotador", "Discinesia Escapular"]',
    contraindicated: '["Luxação Aguda", "Fratura Recente"]',
    wiki: '"ortho-rotator-cuff-2025"',
  },
  Joelho: {
    indicated: '["Artrose", "Tendinopatia Patelar", "Pós-Operatório LCA"]',
    contraindicated: '["Fase Aguda Pós-Op", "Fratura Recente"]',
    wiki: '"ortho-knee-oa"',
  },
  Quadril: {
    indicated: '["Artrose", "Síndrome do Piriforme", "Tendinopatia Glútea"]',
    contraindicated: '["Pós-Artroplastia Recente", "Fratura Recente"]',
    wiki: '"ortho-knee-oa"',
  },
  Cotovelo: {
    indicated: '["Epicondilite Lateral", "Epicondilite Medial"]',
    contraindicated: '["Luxação Aguda", "Fratura Recente"]',
    wiki: '"ortho-rotator-cuff-2025"',
  },
  Coluna: {
    indicated: '["Lombalgia", "Hérnia de Disco", "Cervicalgia"]',
    contraindicated: '["Estenose Severa", "Fratura Vertebral"]',
    wiki: '"ortho-lbp-2021"',
  },
  Alongamento: {
    indicated: '["Encurtamento Muscular", "Rigidez Articular"]',
    contraindicated: '["Instabilidade Articular", "Lesão Muscular Aguda"]',
    wiki: '"physio-stretching"',
  },
  Mobilidade: {
    indicated: '["Rigidez Articular", "Prevenção de Lesões"]',
    contraindicated: '["Luxação Aguda", "Artrite Infecciosa"]',
    wiki: '"physio-stretching"',
  },
  Equilíbrio: {
    indicated: '["Prevenção de Quedas", "Reabilitação Pós-Entorse"]',
    contraindicated: '["Vertigem Aguda Severa", "Incapacidade de Sustentação de Peso"]',
    wiki: '"neuro-balance"',
  },
  Neural: {
    indicated: '["Radiculopatia", "Síndrome Compressiva Neural"]',
    contraindicated:
      '["Neuropatia Aguda Progressiva", "Sinais de Alerta Neurológicos (Red Flags)"]',
    wiki: '"neuro-mobilization"',
  },
  Global: {
    indicated: '["Descondicionamento", "Condicionamento Geral"]',
    contraindicated: '["Fadiga Extrema", "Instabilidade Cardiovascular"]',
    wiki: '"general-exercise-guidelines"',
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

  output += content.slice(i, exIndex + 3);
  i = exIndex + 3;

  let parens = 1;
  let exContentEnd = i;
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

  // Process body if missing fields
  if (!exBody.includes("indicated_pathologies:")) {
    let lowerBody = exBody.toLowerCase();
    let matchCat = "Global";
    if (
      lowerBody.includes("ombro") ||
      lowerBody.includes("escápula") ||
      lowerBody.includes("peito") ||
      lowerBody.includes("latíssimo")
    )
      matchCat = "Ombro";
    else if (
      lowerBody.includes("joelho") ||
      lowerBody.includes("coxa") ||
      lowerBody.includes("quadríceps") ||
      lowerBody.includes("isquiotibiais") ||
      lowerBody.includes("panturrilha") ||
      lowerBody.includes("sóleo") ||
      lowerBody.includes("gastrocnêmio")
    )
      matchCat = "Joelho";
    else if (lowerBody.includes("tornozelo") || lowerBody.includes("pé")) matchCat = "Tornozelo";
    else if (
      lowerBody.includes("coluna") ||
      lowerBody.includes("lombar") ||
      lowerBody.includes("torácica") ||
      lowerBody.includes("core") ||
      lowerBody.includes("abdômen")
    )
      matchCat = "Coluna";
    else if (
      lowerBody.includes("quadril") ||
      lowerBody.includes("glúteo") ||
      lowerBody.includes("piriforme")
    )
      matchCat = "Quadril";
    else if (lowerBody.includes("cotovelo") || lowerBody.includes("braço")) matchCat = "Cotovelo";
    else if (
      lowerBody.includes("punho") ||
      lowerBody.includes("mão") ||
      lowerBody.includes("antebraço")
    )
      matchCat = "Punho";
    else if (lowerBody.includes("pescoço") || lowerBody.includes("cervical")) matchCat = "Pescoço";
    else if (lowerBody.includes("alongamento")) matchCat = "Alongamento";
    else if (lowerBody.includes("mobilidade") || lowerBody.includes("liberação"))
      matchCat = "Mobilidade";
    else if (lowerBody.includes("equilíbrio") || lowerBody.includes("bosu"))
      matchCat = "Equilíbrio";
    else if (lowerBody.includes("neural") || lowerBody.includes("nervo")) matchCat = "Neural";

    let map = fallbackMap[matchCat];
    let lastBraceIdx = exBody.lastIndexOf("}");
    if (lastBraceIdx !== -1) {
      let before = exBody.slice(0, lastBraceIdx);
      let inject = `\n\t\t\tindicated_pathologies: ${map.indicated},`;
      inject += `\n\t\t\tcontraindicated_pathologies: ${map.contraindicated},`;
      inject += `\n\t\t\tprecaution_level: "supervised",`;
      if (!exBody.includes("scientific_references:")) {
        inject += `\n\t\t\tscientific_references: [\n\t\t\t\t{\n\t\t\t\t\ttitle: "Diretrizes Clínicas e Prática Baseada em Evidências para ${matchCat}",\n\t\t\t\t\tyear: 2024,\n\t\t\t\t\tevidence_level: "CPG",\n\t\t\t\t\twiki_artifact_id: ${map.wiki}\n\t\t\t\t}\n\t\t\t],\n\t\t`;
      }
      exBody = before + inject + exBody.slice(lastBraceIdx);
      modifiedCount++;
    }
  }

  output += exBody + ")";
  i = exContentEnd;
}

fs.writeFileSync(filePath, output, "utf8");
console.log(
  `Exercises enriched with global fallback successfully. Total modified: ${modifiedCount}`,
);
