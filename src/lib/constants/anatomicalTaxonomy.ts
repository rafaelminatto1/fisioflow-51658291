/**
 * Anatomical Taxonomy & Cascading Body Parts Utility
 * 
 * Provides unified, canonical anatomical taxonomy, case normalization, deduplication,
 * and 2-level cascading selection (Main Region -> Sub-branch / Joint) for exercise filtering.
 * 
 * Grounded in Physical Therapy Biomechanics & PubMed Literature (PMID: 16558636).
 */

export interface AnatomicalSubBranch {
  key: string;
  label: string;
  shortLabel: string;
  aliases: string[];
}

export interface AnatomicalMainRegion {
  key: string;
  label: string;
  aliases: string[];
  subBranches: AnatomicalSubBranch[];
}

export const ANATOMICAL_TAXONOMY: AnatomicalMainRegion[] = [
  {
    key: "ombro",
    label: "Ombro",
    aliases: ["ombro", "ombros", "shoulder", "complexo do ombro", "membros superiores"],
    subBranches: [
      {
        key: "glenoumeral",
        label: "Ombro (Articulação Glenoumeral)",
        shortLabel: "Articulação Glenoumeral",
        aliases: [
          "glenoumeral",
          "articulação glenoumeral",
          "articulacao glenoumeral",
          "ombros (articulação glenoumeral)",
          "ombro (articulação glenoumeral)",
          "ombros (articulacao glenoumeral)",
          "ombro (articulacao glenoumeral)",
          "glenohumeral",
        ],
      },
      {
        key: "acromioclavicular",
        label: "Ombro (Articulação Acromioclavicular)",
        shortLabel: "Articulação Acromioclavicular",
        aliases: [
          "acromioclavicular",
          "articulação acromioclavicular",
          "articulacao acromioclavicular",
          "ombro (acromioclavicular)",
          "ombros (acromioclavicular)",
        ],
      },
      {
        key: "esternoclavicular",
        label: "Ombro (Articulação Esternoclavicular)",
        shortLabel: "Articulação Esternoclavicular",
        aliases: [
          "esternoclavicular",
          "articulação esternoclavicular",
          "articulacao esternoclavicular",
          "ombro (esternoclavicular)",
        ],
      },
      {
        key: "escapulotoracica",
        label: "Ombro (Articulação Escapulotorácica)",
        shortLabel: "Articulação Escapulotorácica",
        aliases: [
          "escapulotoracica",
          "escapulotorácica",
          "escápula",
          "escapula",
          "ombro (escapulotorácica)",
          "ombro (escápula)",
        ],
      },
      {
        key: "manguito_rotador",
        label: "Ombro (Manguito Rotador)",
        shortLabel: "Manguito Rotador",
        aliases: [
          "manguito rotador",
          "manguito",
          "rotator cuff",
          "supraespinhal",
          "infraespinhal",
          "subescapular",
          "redondo menor",
        ],
      },
    ],
  },
  {
    key: "joelho",
    label: "Joelho",
    aliases: ["joelho", "joelhos", "knee"],
    subBranches: [
      {
        key: "patelofemoral",
        label: "Joelho (Articulação Patelofemoral)",
        shortLabel: "Articulação Patelofemoral",
        aliases: [
          "patelofemoral",
          "articulação patelofemoral",
          "joelho (patelofemoral)",
          "joelhos (patelofemoral)",
          "patela",
        ],
      },
      {
        key: "tibiofemoral",
        label: "Joelho (Articulação Tibiofemoral)",
        shortLabel: "Articulação Tibiofemoral",
        aliases: ["tibiofemoral", "articulação tibiofemoral", "joelho (tibiofemoral)"],
      },
      {
        key: "meniscos_ligamentos",
        label: "Joelho (Meniscos e Ligamentos)",
        shortLabel: "Meniscos e Ligamentos",
        aliases: ["menisco", "meniscos", "lca", "lcp", "ligamento cruzado", "ligamento collateral"],
      },
    ],
  },
  {
    key: "coluna",
    label: "Coluna",
    aliases: ["coluna", "spine", "vertebral"],
    subBranches: [
      {
        key: "cervical",
        label: "Coluna Cervical",
        shortLabel: "Coluna Cervical",
        aliases: ["cervical", "coluna cervical", "pescoço", "pescoco", "cabeça/pescoço"],
      },
      {
        key: "toracica",
        label: "Coluna Torácica",
        shortLabel: "Coluna Torácica",
        aliases: ["toracica", "torácica", "coluna torácica", "coluna toracica", "dorsal"],
      },
      {
        key: "lombar",
        label: "Coluna Lombar",
        shortLabel: "Coluna Lombar",
        aliases: ["lombar", "coluna lombar", "lumbosacral"],
      },
    ],
  },
  {
    key: "quadril",
    label: "Quadril",
    aliases: ["quadril", "quadris", "hip"],
    subBranches: [
      {
        key: "coxofemoral",
        label: "Quadril (Articulação Coxofemoral)",
        shortLabel: "Articulação Coxofemoral",
        aliases: ["coxofemoral", "articulação coxofemoral", "quadril (coxofemoral)"],
      },
      {
        key: "sacroiliaca",
        label: "Quadril (Sacroilíaca & Pélvis)",
        shortLabel: "Sacroilíaca & Pélvis",
        aliases: ["sacroiliaca", "sacroilíaca", "pelvis", "pélvis", "pelve", "pubis"],
      },
      {
        key: "gluteos",
        label: "Quadril (Região Glútea)",
        shortLabel: "Região Glútea",
        aliases: ["gluteos", "glúteos", "gluteo"],
      },
    ],
  },
  {
    key: "cotovelo",
    label: "Cotovelo",
    aliases: ["cotovelo", "cotovelos", "elbow"],
    subBranches: [
      {
        key: "ulnoumeral",
        label: "Cotovelo (Articulação Radio-ulno-umeral)",
        shortLabel: "Articulação Radio-ulno-umeral",
        aliases: ["radio-ulnar", "ulnoumeral", "radioumeral"],
      },
      {
        key: "epicondilo",
        label: "Cotovelo (Epicôndilos / Tendões)",
        shortLabel: "Epicôndilos / Tendões",
        aliases: ["epicondilo", "epicôndilo", "epicondilite"],
      },
    ],
  },
  {
    key: "punho_mao",
    label: "Punho / Mão",
    aliases: ["punho", "mão", "mao", "wrist", "hand", "punho/mão", "punho / mão"],
    subBranches: [
      {
        key: "carpo",
        label: "Punho (Articulação Radio-Cárpica)",
        shortLabel: "Articulação Radio-Cárpica",
        aliases: ["carpo", "radiocarpica", "radio-cárpica", "punho"],
      },
      {
        key: "dedos",
        label: "Mão e Dedos",
        shortLabel: "Mão e Dedos",
        aliases: ["dedos", "falanges", "metacarpo", "mão"],
      },
    ],
  },
  {
    key: "tornozelo_pe",
    label: "Tornozelo / Pé",
    aliases: ["tornozelo", "pé", "pe", "ankle", "foot", "tornozelo/pé", "tornozelo / pé"],
    subBranches: [
      {
        key: "talocrural",
        label: "Tornozelo (Articulação Talocrural)",
        shortLabel: "Articulação Talocrural",
        aliases: ["talocrural", "articulação talocrural"],
      },
      {
        key: "subtalar",
        label: "Tornozelo (Articulação Subtalar)",
        shortLabel: "Articulação Subtalar",
        aliases: ["subtalar", "articulação subtalar"],
      },
      {
        key: "fascia_pe",
        label: "Pé (Fáscia & Planta)",
        shortLabel: "Fáscia & Planta do Pé",
        aliases: ["fascia", "fáscia", "planta do pé", "metatarso"],
      },
    ],
  },
  {
    key: "core_abdomen",
    label: "Core / Abdômen",
    aliases: ["core", "abdomen", "abdômen", "abdominal", "tronco"],
    subBranches: [],
  },
];

/**
 * Normalizes text string for accent-insensitive and case-insensitive comparison
 */
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Matches a raw body part string (from exercise records) against our anatomical taxonomy.
 * Returns the matching main region key and optional sub-branch key.
 */
export function classifyRawBodyPart(rawPart: string): {
  mainRegionKey?: string;
  subBranchKey?: string;
} {
  const norm = normalizeString(rawPart);

  for (const region of ANATOMICAL_TAXONOMY) {
    // Check sub-branches first for more specific match
    for (const sub of region.subBranches) {
      if (sub.aliases.some((alias) => norm.includes(normalizeString(alias)))) {
        return { mainRegionKey: region.key, subBranchKey: sub.key };
      }
    }

    // Check main region aliases
    if (region.aliases.some((alias) => norm.includes(normalizeString(alias)))) {
      return { mainRegionKey: region.key };
    }
  }

  return {};
}

/**
 * Given a list of exercises, extracts all available main regions that have exercises.
 */
export function getAvailableMainRegions(exercises: { body_parts?: string[] | null }[]) {
  const presentKeys = new Set<string>();

  exercises.forEach((ex) => {
    const parts = ex.body_parts || [];
    parts.forEach((p) => {
      const { mainRegionKey } = classifyRawBodyPart(p);
      if (mainRegionKey) {
        presentKeys.add(mainRegionKey);
      } else if (p && p.trim()) {
        // Fallback for unmapped custom body parts
        presentKeys.add(`custom_${normalizeString(p)}`);
      }
    });
  });

  const regions: { key: string; label: string }[] = [];

  // Add taxonomy regions that have exercises
  ANATOMICAL_TAXONOMY.forEach((region) => {
    if (presentKeys.has(region.key)) {
      regions.push({ key: region.key, label: region.label });
    }
  });

  // Add unmapped custom regions if any
  presentKeys.forEach((key) => {
    if (key.startsWith("custom_")) {
      const rawLabel = key.replace("custom_", "");
      const formatted = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
      regions.push({ key, label: formatted });
    }
  });

  return regions;
}

/**
 * Given a main region key and a list of exercises, returns available sub-branches.
 */
export function getAvailableSubBranches(
  mainRegionKey: string,
  exercises: { body_parts?: string[] | null }[]
) {
  if (!mainRegionKey || mainRegionKey === "all") return [];

  const mainRegion = ANATOMICAL_TAXONOMY.find((r) => r.key === mainRegionKey);
  if (!mainRegion || mainRegion.subBranches.length === 0) return [];

  const presentSubKeys = new Set<string>();

  exercises.forEach((ex) => {
    const parts = ex.body_parts || [];
    parts.forEach((p) => {
      const { mainRegionKey: mKey, subBranchKey: sKey } = classifyRawBodyPart(p);
      if (mKey === mainRegionKey && sKey) {
        presentSubKeys.add(sKey);
      }
    });
  });

  return mainRegion.subBranches.filter((sub) => presentSubKeys.has(sub.key));
}

/**
 * Evaluates whether an exercise matches selected main region and sub-branch filters.
 */
export function matchesAnatomicalFilter(
  exercise: { body_parts?: string[] | null },
  mainRegionFilter: string,
  subBranchFilter: string = "all"
): boolean {
  if (mainRegionFilter === "all") return true;

  const parts = exercise.body_parts || [];
  if (parts.length === 0) return false;

  return parts.some((p) => {
    const { mainRegionKey, subBranchKey } = classifyRawBodyPart(p);

    if (mainRegionFilter.startsWith("custom_")) {
      const rawTarget = mainRegionFilter.replace("custom_", "");
      return normalizeString(p) === rawTarget;
    }

    if (mainRegionKey !== mainRegionFilter) {
      return false;
    }

    // If sub-branch filter is 'all', any sub-branch or general match for this main region is accepted!
    if (subBranchFilter === "all") {
      return true;
    }

    // If a specific sub-branch is selected, verify subBranchKey matches
    return subBranchKey === subBranchFilter;
  });
}

export interface SelectedAnatomicalFilter {
  id: string;
  mainRegionKey: string;
  subBranchKey?: string;
  label: string;
}

/**
 * Evaluates whether an exercise matches a list of multiple selected anatomical filters
 * with support for boolean OR (any match) and AND (all match) modes.
 */
export function matchesMultiAnatomicalFilter(
  exercise: { body_parts?: string[] | null },
  filters: SelectedAnatomicalFilter[],
  matchMode: "OR" | "AND" = "OR"
): boolean {
  if (!filters || filters.length === 0) return true;

  if (matchMode === "AND") {
    return filters.every((f) =>
      matchesAnatomicalFilter(exercise, f.mainRegionKey, f.subBranchKey || "all")
    );
  } else {
    return filters.some((f) =>
      matchesAnatomicalFilter(exercise, f.mainRegionKey, f.subBranchKey || "all")
    );
  }
}

