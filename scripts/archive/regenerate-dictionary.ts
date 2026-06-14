import * as fs from "fs";
import * as path from "path";

const enrichedPath = path.join(process.cwd(), "scripts/enriched-data.json");
if (!fs.existsSync(enrichedPath)) {
  console.error("Enriched data not found at:", enrichedPath);
  process.exit(1);
}
const enrichedData = JSON.parse(fs.readFileSync(enrichedPath, "utf8"));

let output = `/**
 * Exercise Dictionary - Extended bilingual catalog for physiotherapy exercises.
 * Organized by body region and movement pattern, with detailed descriptions.
 * This is a FREE, LOCAL dictionary — no external APIs needed.
 */

export interface ExerciseEntry extends PhysioDictionaryEntry {
	category: "exercise";
	target_outcome?: Array<"Analgesia" | "Mobilidade" | "Estabilidade" | "Força" | "Potência" | "Cardio">;
	intensity_level?: 1 | 2 | 3 | 4 | 5; // 1: Inicial/Pós-Op, 5: Elite
	required_equipment?: string[];
	progression_suggestion?: string; // ID do próximo exercício na cadeia
	suggested_sets?: number;
	suggested_reps?: number;
	suggested_rpe?: string; // e.g., "7-8"
	instruction_pt?: string; // Humanized instruction for patient
	image_url?: string; // Path to illustration
}

function ex(
	id: string, pt: string, en: string,
	aliases_pt: string[] = [], aliases_en: string[] = [],
	subcategory = "", description_pt = "", description_en = "",
	metadata: Partial<Omit<ExerciseEntry, keyof PhysioDictionaryEntry>> = {}
): ExerciseEntry {
	return {
		id, pt, en, aliases_pt, aliases_en,
		category: "exercise", subcategory, description_pt, description_en,
		...metadata
	};
}

`;

const sections = {
  lowerBody: "MEMBROS INFERIORES",
  upperBody: "MEMBROS SUPERIORES",
  coreSpine: "CORE E COLUNA",
  functional: "FUNCIONAIS E COMPOSTOS",
  stretching: "ALONGAMENTOS",
  mobility: "MOBILIDADE",
  respiratory: "RESPIRATÓRIO",
  neuromuscular: "NEUROMUSCULAR",
  vestibular: "VESTIBULAR",
  neurodynamics: "NEURODINÂMICA",
  geriatricFunctional: "GERIÁTRICO / FUNCIONAL",
};

const subToSection = {
  Joelho: "lowerBody",
  Quadril: "lowerBody",
  "Joelho / Quadril": "lowerBody",
  Tornozelo: "lowerBody",
  "Tornozelo / Perna": "lowerBody",
  "Posterior / Quadril": "lowerBody",
  "Posterior da Coxa": "lowerBody",
  "Quadril / Glúteo": "lowerBody",
  Propriocepção: "lowerBody",
  "Pliometria / RTS": "lowerBody",
  Posterior: "lowerBody",
  Ombro: "upperBody",
  "Ombro / Escápula": "upperBody",
  Escápula: "upperBody",
  Cotovelo: "upperBody",
  "Cotovelo / Braço": "upperBody",
  Antebraço: "upperBody",
  Mão: "upperBody",
  Core: "coreSpine",
  Coluna: "coreSpine",
  "Coluna Torácica": "coreSpine",
  Cervical: "coreSpine",
  Funcional: "functional",
  Pliometria: "functional",
  "Pliometria / Corrida": "functional",
  Alongamento: "stretching",
  Liberação: "stretching",
  Mobilidade: "mobility",
  Respiratório: "respiratory",
  Neuromuscular: "neuromuscular",
  Vestibular: "vestibular",
  Neurodinâmica: "neurodynamics",
  "Geriátrico / Funcional": "geriatricFunctional",
};

const categorized = {};
Object.keys(sections).forEach((s) => (categorized[s] = []));

enrichedData.forEach((exData) => {
  let section = subToSection[exData.subcategory] || "functional";
  categorized[section].push(exData);
});

Object.entries(sections).forEach(([key, title]) => {
  output += `// ─── ${title} ─────────────────────────────────────\n`;
  output += `const ${key}: PhysioDictionaryEntry[] = [\n`;
  categorized[key].forEach((e) => {
    const metadata = {
      intensity_level: e.intensity_level,
      target_outcome: e.target_outcome,
      required_equipment: e.required_equipment,
      progression_suggestion: e.progression_suggestion,
      suggested_sets: e.suggested_sets,
      suggested_reps: e.suggested_reps,
      suggested_rpe: e.suggested_rpe,
      instruction_pt: e.instruction_pt,
      image_url: e.image_url,
    };

    // Remove undefined fields from metadata
    Object.keys(metadata).forEach((k) => metadata[k] === undefined && delete metadata[k]);

    output += `\tex("${e.id}", "${e.pt}", "${e.en}", ${JSON.stringify(e.aliases_pt)}, ${JSON.stringify(e.aliases_en)}, "${e.subcategory}", "${e.description_pt}", "${e.description_en}", ${JSON.stringify(metadata, null, 2).replace(/\n/g, "\n\t")}),\n`;
  });
  output += `];\n\n`;
});

output += `export const exerciseDictionary: ExerciseEntry[] = [\n`;
Object.keys(sections).forEach((key) => {
  output += `\t...${key},\n`;
});
output += `];\n`;

const targetPath = path.join(process.cwd(), "src/data/exerciseDictionary.ts");
fs.writeFileSync(targetPath, output);
console.log("Successfully wrote to:", targetPath);
