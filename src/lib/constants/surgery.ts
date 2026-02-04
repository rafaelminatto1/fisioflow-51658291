/**
 * Constantes compartilhadas para cirurgias (formulário e exibição)
 */

export const SURGERY_TYPES = [
  { value: 'artroscopia', label: 'Artroscopia' },
  { value: 'reconstrucao_lca', label: 'Reconstrução LCA' },
  { value: 'reconstrucao_lcp', label: 'Reconstrução LCP' },
  { value: 'meniscectomia', label: 'Meniscectomia' },
  { value: 'artroplastia_joelho', label: 'Artroplastia de Joelho' },
  { value: 'artroplastia_quadril', label: 'Artroplastia de Quadril' },
  { value: 'artrodese', label: 'Artrodese' },
  { value: 'reparo_manguito', label: 'Reparo de Manguito Rotador' },
  { value: 'descompressao_subacromial', label: 'Descompressão Subacromial' },
  { value: 'hernia_disco', label: 'Hérnia de Disco' },
  { value: 'fusao_vertebral', label: 'Fusão Vertebral' },
  { value: 'osteossintese', label: 'Osteossíntese' },
  { value: 'outro', label: 'Outro' },
] as const;

export const AFFECTED_SIDES = [
  { value: 'direito', label: 'Direito' },
  { value: 'esquerdo', label: 'Esquerdo' },
  { value: 'bilateral', label: 'Bilateral' },
  { value: 'nao_aplicavel', label: 'Não Aplicável' },
] as const;

export function getSurgeryTypeLabel(value: string): string {
  const found = SURGERY_TYPES.find((t) => t.value === value);
  return found?.label ?? (value || '—');
}

export function getAffectedSideLabel(value: string): string {
  const found = AFFECTED_SIDES.find((s) => s.value === value);
  return found?.label ?? (value || '—');
}
