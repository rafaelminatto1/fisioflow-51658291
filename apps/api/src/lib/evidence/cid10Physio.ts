// Mapa curado de CID-10 comuns em fisioterapia → rótulo PT-BR + query PubMed (inglês/MeSH).
// Usado para expandir um diagnóstico (CID-10) numa busca de evidência mais eficaz.
export type Cid10Entry = { label: string; query: string };

export const CID10_PHYSIO: Record<string, Cid10Entry> = {
  // Coluna
  M545: { label: "Dor lombar baixa", query: "low back pain exercise therapy" },
  M544: { label: "Lumbago com ciática", query: "sciatica low back pain physical therapy" },
  M542: { label: "Cervicalgia", query: "neck pain exercise therapy" },
  M51: { label: "Hérnia de disco lombar", query: "lumbar disc herniation rehabilitation" },
  M48: { label: "Estenose do canal vertebral", query: "spinal stenosis physical therapy" },
  M47: { label: "Espondilose", query: "spondylosis rehabilitation" },
  // Ombro
  M75: { label: "Lesões do ombro", query: "shoulder pain rotator cuff rehabilitation" },
  M751: { label: "Síndrome do manguito rotador", query: "rotator cuff tendinopathy exercise" },
  M750: { label: "Capsulite adesiva (ombro congelado)", query: "adhesive capsulitis frozen shoulder physical therapy" },
  // Cotovelo / punho
  M771: { label: "Epicondilite lateral", query: "lateral epicondylitis tennis elbow exercise" },
  M770: { label: "Epicondilite medial", query: "medial epicondylitis golfer elbow" },
  G560: { label: "Síndrome do túnel do carpo", query: "carpal tunnel syndrome conservative treatment" },
  // Joelho / quadril
  M17: { label: "Gonartrose (artrose do joelho)", query: "knee osteoarthritis exercise therapy" },
  M16: { label: "Coxartrose (artrose do quadril)", query: "hip osteoarthritis exercise therapy" },
  M23: { label: "Transtorno interno do joelho", query: "knee meniscus internal derangement rehabilitation" },
  M2256: { label: "Síndrome patelofemoral", query: "patellofemoral pain syndrome exercise" },
  S835: { label: "Entorse do LCA (joelho)", query: "anterior cruciate ligament injury rehabilitation" },
  // Tornozelo / pé
  S934: { label: "Entorse de tornozelo", query: "ankle sprain rehabilitation exercise" },
  M722: { label: "Fasciíte plantar", query: "plantar fasciitis physical therapy" },
  // Geral / muscular
  M797: { label: "Fibromialgia", query: "fibromyalgia exercise therapy" },
  M255: { label: "Dor articular (artralgia)", query: "joint pain arthralgia physical therapy" },
  M626: { label: "Distensão muscular", query: "muscle strain rehabilitation" },
  // Neuro
  G20: { label: "Doença de Parkinson", query: "Parkinson disease physical therapy rehabilitation" },
  G35: { label: "Esclerose múltipla", query: "multiple sclerosis rehabilitation exercise" },
  G81: { label: "Hemiplegia", query: "hemiplegia stroke rehabilitation" },
  I69: { label: "Sequelas de AVC", query: "stroke rehabilitation physical therapy" },
  G80: { label: "Paralisia cerebral", query: "cerebral palsy physical therapy" },
};

/** Normaliza um CID-10 (remove ponto/espaço, maiúsculas). Ex: "m54.5" → "M545". */
export function normalizeCid10(code: string): string {
  return code.trim().toUpperCase().replace(/[.\s]/g, "");
}

/**
 * Resolve um CID-10 para entrada curada. Tenta match exato e depois prefixos
 * decrescentes (ex.: "M5453" → "M545" → "M54"... ) para cair na categoria mais específica disponível.
 */
export function lookupCid10(code: string): (Cid10Entry & { code: string }) | null {
  const norm = normalizeCid10(code);
  for (let end = norm.length; end >= 2; end--) {
    const key = norm.slice(0, end);
    if (CID10_PHYSIO[key]) return { code: key, ...CID10_PHYSIO[key] };
  }
  return null;
}
