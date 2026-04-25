export interface ClinicalReference {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  key_metric: string;
  threshold?: string;
}

export const clinicalReferences: Record<string, ClinicalReference> = {
  adams_test: {
    id: "adams_test",
    title:
      "Is the forward-bending test an accurate diagnostic criterion for the screening of scoliosis?",
    authors: "Karachalios T, et al.",
    year: 1999,
    journal: "Spine",
    key_metric: "ATR (Angle of Trunk Rotation)",
    threshold: "> 5° to 7° indicates clinical referral.",
  },
  bosco_jump: {
    id: "bosco_jump",
    title: "A simple-method for measurement of mechanical power in jumping",
    authors: "Bosco C, et al.",
    year: 1983,
    journal: "European Journal of Applied Physiology",
    key_metric: "Flight Time Jump Height",
    threshold: "h = (g * t^2) / 8",
  },
  morin_gait: {
    id: "morin_gait",
    title: "A simple method for measuring stiffness during running",
    authors: "Morin JB, et al.",
    year: 2005,
    journal: "Journal of Applied Biomechanics",
    key_metric: "Vertical Stiffness & Temporal Parameters",
    threshold: "Vertical Oscillation avg < 10cm for elite economy.",
  },
  sapo_posture: {
    id: "sapo_posture",
    title: "Postural assessment software (PAS/SAPO): Validation and reliability",
    authors: "Ferreira EA, et al.",
    year: 2010,
    journal: "Clinics (Sao Paulo)",
    key_metric: "Computerized Photogrammetry",
    threshold: "Inter-rater reliability ICC > 0.90",
  },
};
