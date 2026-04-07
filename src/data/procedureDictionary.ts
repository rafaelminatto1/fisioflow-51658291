import type { PhysioDictionaryEntry } from './physioDictionary';

export const procedureDictionary: PhysioDictionaryEntry[] = [
  {
    id: 'proc_dry_needling',
    pt: 'Agulhamento a Seco',
    en: 'Dry Needling',
    category: 'procedure',
    aliases_pt: ['Agulhamento', 'Dry Needling'],
    aliases_en: ['Needling'],
    description_pt: 'Técnica de agulhamento para inativação de pontos-gatilho miofasciais.'
  },
  {
    id: 'proc_taping',
    pt: 'Bandagem Elástica',
    en: 'Kinesio Taping',
    category: 'procedure',
    aliases_pt: ['Kinesio', 'Tape', 'Bandagem funcional', 'Esparadrapagem'],
    aliases_en: ['Taping', 'Kinesiology tape'],
    description_pt: 'Aplicação de faixas elásticas para suporte e modulação sensorial.'
  },
  {
    id: 'proc_mfr',
    pt: 'Liberação Miofascial',
    en: 'Myofascial Release',
    category: 'procedure',
    aliases_pt: ['MFR', 'Pompage', 'Liberação instrumental'],
    aliases_en: ['MFR', 'Fascial release', 'IASTM'],
    description_pt: 'Terapia manual focada em relaxamento de fáscias e tecidos moles.'
  },
  {
    id: 'proc_tens',
    pt: 'Neuromodulação Transcutânea (TENS)',
    en: 'TENS (Transcutaneous Electrical Nerve Stimulation)',
    category: 'procedure',
    aliases_pt: ['TENS', 'Eletro', 'Eletroterapia', 'Eletroestimulação'],
    aliases_en: ['Electrical stimulation', 'E-stim'],
    description_pt: 'Terapia analgésica através de estímulos elétricos não invasivos.'
  },
  {
    id: 'proc_tens_nm',
    pt: 'Estimulação Elétrica Neuromuscular (FES)',
    en: 'NMES (Neuromuscular Electrical Stimulation)',
    category: 'procedure',
    aliases_pt: ['FES', 'Estimulação motora', 'Eletroestimulação muscular', 'Aussie', 'Russa'],
    aliases_en: ['NMES', 'EMS'],
    description_pt: 'Terapia para ganho ou facilitação de contração muscular.'
  },
  {
    id: 'proc_manipulation',
    pt: 'Manipulação Articular',
    en: 'Joint Manipulation',
    category: 'procedure',
    aliases_pt: ['Ajuste quiroprático', 'Manipulação osteopática', 'Thrust', 'HVLA'],
    aliases_en: ['HVLA', 'Chiropractic adjustment', 'Spinal manipulation'],
    description_pt: 'Técnica de alta velocidade e baixa amplitude.'
  },
  {
    id: 'proc_mobilization',
    pt: 'Mobilização Articular',
    en: 'Joint Mobilization',
    category: 'procedure',
    aliases_pt: ['Maitland', 'Mulligan', 'Mobilização', 'Deslizamento articular'],
    aliases_en: ['Maitland', 'Mulligan', 'Glide'],
    description_pt: 'Técnica manual passiva aplicada sobre uma articulação.'
  },
  {
    id: 'proc_us',
    pt: 'Ultrassom Terapêutico',
    en: 'Therapeutic Ultrasound',
    category: 'procedure',
    aliases_pt: ['US', 'Aparelho de ultrassom'],
    aliases_en: ['US', 'Ultrasound'],
    description_pt: 'Aplicação de ondas sonoras mecânicas profundas.'
  },
  {
    id: 'proc_laser',
    pt: 'Laserterapia de Baixa Intensidade',
    en: 'Low-Level Laser Therapy (LLLT)',
    category: 'procedure',
    aliases_pt: ['Laser', 'Fotobiomodulação', 'LLLT'],
    aliases_en: ['Laserterapy', 'Photobiomodulation', 'PBM'],
    description_pt: 'Emissão de energia luminosa para reparo tecidual e inflamação.'
  }
];
