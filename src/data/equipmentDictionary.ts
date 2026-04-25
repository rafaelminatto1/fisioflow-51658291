// Let's extend physioDictionary types to include 'equipment' inline
import type { PhysioDictionaryEntry } from "./physioDictionary";

export const equipmentDictionary: (PhysioDictionaryEntry | { category: string })[] = [
  {
    id: "eq_foam_roller",
    pt: "Rolo de Liberação",
    en: "Foam Roller",
    category: "equipment" as any, // using any as it's a new category not in PhysioTermCategory yet, string is acceptable at runtime
    aliases_pt: ["Rolo miofascial", "Rolo de espuma", "Liberação"],
    aliases_en: ["Foam", "Grid roller"],
    description_pt: "Cilindro de espuma utilizado em autoliberação e exercícios posturais.",
  },
  {
    id: "eq_resistance_band",
    pt: "Faixa Elástica (Theraband)",
    en: "Resistance Band / Theraband",
    category: "equipment" as any,
    aliases_pt: ["Theraband", "Banda elástica", "Elástico", "Extensor elástico", "Garrote"],
    aliases_en: ["Therabands", "Elastic band", "Strech band"],
    description_pt:
      "Bandas com níveis variados de tensão comumente usadas em exercícios isotônicos resistidos.",
  },
  {
    id: "eq_mini_band",
    pt: "Mini Band",
    en: "Mini Band",
    category: "equipment" as any,
    aliases_pt: ["Band circular", "Loop band", "Elástico de glúteos"],
    aliases_en: ["Booty band", "Circle band", "Loop resistance"],
    description_pt: "Elástico circular de pequeno circuito útil para rotadores e abdução.",
  },
  {
    id: "eq_swiss_ball",
    pt: "Bola Suíça",
    en: "Swiss Ball",
    category: "equipment" as any,
    aliases_pt: [
      "Bola suíça",
      "Bola de Pilates",
      "Bola de estabilidade",
      "Bola de Bobath",
      "Gymball",
    ],
    aliases_en: ["Stability ball", "Exercise ball", "Gym ball", "Physio ball"],
    description_pt:
      "Bola ampla insuflável para gerar bases instáveis ou suportes confortáveis passivos.",
  },
  {
    id: "eq_bosu",
    pt: "Meia Lua de Equilíbrio (BOSU)",
    en: "BOSU Balance Trainer",
    category: "equipment" as any,
    aliases_pt: ["BOSU", "Meia bola", "Meia lua"],
    aliases_en: ["BOSU ball"],
    description_pt: "Equipamento em forma de semi-esfera inflável acoplado a base plana.",
  },
  {
    id: "eq_kettlebell",
    pt: "Pesos Kettlebell",
    en: "Kettlebell",
    category: "equipment" as any,
    aliases_pt: ["Kettlebell", "Peso de alça"],
    aliases_en: ["KB", "Russian weights"],
    description_pt:
      "Peso livre em formato oval assemelhando-se a uma chaleira para exercícios de swing.",
  },
  {
    id: "eq_slanted_board",
    pt: "Prancha de Alongamento Inclinada",
    en: "Slant Board",
    category: "equipment" as any,
    aliases_pt: ["Slant", "Rampa", "Plataforma para panturrilha"],
    aliases_en: ["Slantboard", "Calf stretcher"],
    description_pt:
      "Superfície de plano inclinado adaptável sob os pés, ótima para reabilitação patelar ou aquiliano.",
  },
] as any[];
