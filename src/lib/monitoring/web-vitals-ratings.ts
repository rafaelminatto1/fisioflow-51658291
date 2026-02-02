/**
 * Ratings e cores para Web Vitals (extraído para evitar aviso HMR Fast Refresh).
 */

export type Rating = 'good' | 'needs-improvement' | 'poor';

export const THRESHOLDS = {
  fcp: { good: 1800, poor: 3000 },
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
} as const;

export function getRating(
  metricName: keyof typeof THRESHOLDS,
  value: number
): Rating {
  const threshold = THRESHOLDS[metricName];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 'good':
      return '#047857';
    case 'needs-improvement':
      return '#b45309';
    case 'poor':
      return '#b91c1c';
    default:
      return '#6b7280';
  }
}
