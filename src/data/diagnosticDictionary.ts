import type { PhysioDictionaryEntry } from './physioDictionary';

export const diagnosticDictionary: PhysioDictionaryEntry[] = [
  {
    id: 'diag_stroke',
    pt: 'Acidente Vascular Cerebral (AVC)',
    en: 'Stroke (CVA)',
    category: 'condition',
    subcategory: 'Neuro',
    aliases_pt: ['AVC', 'AVE', 'Derrame', 'Cerebrovascular'],
    aliases_en: ['CVA', 'Cerebrovascular accident'],
    description_pt: 'Lesão neurológica central.'
  },
  {
    id: 'diag_lbp',
    pt: 'Lombalgia',
    en: 'Low Back Pain (LBP)',
    category: 'condition',
    subcategory: 'Lombar',
    aliases_pt: ['Lombalgia', 'Lumbago', 'Dor na lombar', 'Dor nas costas', 'Ciatalgia'],
    aliases_en: ['Back pain', 'Lumbago', 'Sciatica', 'LBP'],
    description_pt: 'Dor inespecífica ou específica na região lombar.'
  },
  {
    id: 'diag_frozen_shoulder',
    pt: 'Capsulite Adesiva',
    en: 'Frozen Shoulder',
    category: 'condition',
    subcategory: 'Ombro',
    aliases_pt: ['Ombro Congelado', 'Capsulite'],
    aliases_en: ['Adhesive capsulitis', 'Frozen shoulder'],
    description_pt: 'Rigidez e dor progressiva na articulação glenoumeral.'
  },
  {
    id: 'diag_impingement',
    pt: 'Síndrome do Impacto do Ombro',
    en: 'Shoulder Impingement Syndrome',
    category: 'condition',
    subcategory: 'Ombro',
    aliases_pt: ['Impacto', 'Síndrome do manguito', 'Tendinite do supra', 'Bursite'],
    aliases_en: ['Impingement', 'Rotator cuff syndrome', 'Sia'],
    description_pt: 'Compressão das estruturas subacromiais.'
  },
  {
    id: 'diag_patellofemoral',
    pt: 'Síndrome da Dor Femoropatelar (SDFP)',
    en: 'Patellofemoral Pain Syndrome (PFPS)',
    category: 'condition',
    subcategory: 'Joelho',
    aliases_pt: ['SDFP', 'Condromalácia', 'Dor anterior no joelho'],
    aliases_en: ['PFPS', 'Runner\'s knee', 'Chondromalacia', 'Anterior knee pain'],
    description_pt: 'Dor patelofemoral não estrutural multifatorial.'
  },
  {
    id: 'diag_tennis_elbow',
    pt: 'Epicondilite Lateral',
    en: 'Lateral Epicondylitis (Tennis Elbow)',
    category: 'condition',
    subcategory: 'Cotovelo',
    aliases_pt: ['Cotovelo de tenista', 'Epicondilagia lateral'],
    aliases_en: ['Tennis elbow', 'Lateral epicondylalgia'],
    description_pt: 'Tendinopatia degenerativa na origem dos tendões extensores do carpo.'
  },
  {
    id: 'diag_ankle_sprain',
    pt: 'Entorse de Tornozelo',
    en: 'Ankle Sprain',
    category: 'condition',
    subcategory: 'Tornozelo',
    aliases_pt: ['Torção', 'Virou o pé', 'Entorse latereal', 'Lesão ligamentar ATFL'],
    aliases_en: ['Rolled ankle', 'ATFL injury', 'Lateral ligament sprain'],
    description_pt: 'Estiramento ou ruptura ligamentar aguda, mais comumente no complexo lateral.'
  },
  {
    id: 'diag_plantar_fasciitis',
    pt: 'Fasciíte Plantar',
    en: 'Plantar Fasciitis',
    category: 'condition',
    subcategory: 'Pé',
    aliases_pt: ['Fascite plantar', 'Fasciopatia plantar', 'Dor no calcanhar', 'Esporão'],
    aliases_en: ['Plantar heel pain', 'Heel spur syndrome', 'Plantar fasciopathy'],
    description_pt: 'Caracterizada por dor na planta do pé devido a sobrecarga da aponeurose.'
  }
];
