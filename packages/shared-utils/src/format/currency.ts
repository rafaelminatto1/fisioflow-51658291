export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatCurrency(value);
}

export function parseCurrency(value: string): number {
  // Remove R$, espaços e pontos de milhar, substitui vírgula por ponto
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}
