export const PDF_COLORS = {
  primary: [79, 70, 229] as const, // Indigo
  secondary: [59, 130, 246] as const, // Blue
  success: [34, 197, 94] as const, // Green
  warning: [251, 191, 36] as const, // Yellow
  danger: [239, 68, 68] as const, // Red
  muted: [107, 114, 128] as const, // Gray
} as const;

export const RISK_THRESHOLDS = {
  low: 30,
  medium: 60,
} as const;

export const SUCCESS_THRESHOLDS = {
  low: 40,
  medium: 70,
} as const;
