/**
 * Tokens do FisioFlow Design System, portados para React Native.
 *
 * Fonte: `claudedesign/fisioflow-design-system/project/colors_and_type.css`.
 * Este arquivo é a ÚNICA tradução daquele CSS. `constants/colors.ts` e
 * `constants/biomecanica.ts` reexportam daqui — antes eram duas paletas
 * paralelas que já divergiam (o azul batia, os cinzas não).
 *
 * Regras duras da marca, do SKILL.md do design system:
 * - PT-BR only na interface.
 * - Sem emoji em UI de produto; ícones via lucide-react-native.
 * - Azul Activity #0080FF é ESCASSO: ação primária, foco e estado ativo. Não
 *   é cor de fundo nem de decoração.
 * - Neutros dominam (cinzas de matiz fria, 220°).
 * - Cards são chapados. Sombra só em popover/menu — nunca em card de lista.
 * - Raio base 16px.
 *
 * O CSS de origem traz utilitários `.glass-panel` e `.glass-card`, que NÃO
 * foram portados: a regra do projeto é superfícies sólidas, sem
 * backdrop-blur. Onde as duas fontes divergem, a regra do projeto vence.
 */

export const palette = {
  /** Azul Activity. Use com parcimônia. */
  primary: "#0080FF",
  primaryDark: "#0066CC",
  primaryLight: "#4DA6FF",
  /** Fundo de chip/realce em azul. */
  primarySoft: "#DBEBFF",
  primaryTint: "#F0F7FF",
  primaryText: "#0064C7",

  /** Teal clínico — segunda cor, para acento não acionável. */
  accent: "#2DD4A7",
  accentDark: "#0D9488",

  background: "#F7F9FB",
  card: "#FFFFFF",
  surface: "#F9FAFB",
  surfaceHover: "#F3F4F6",

  text: "#0B1220",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",

  border: "#E5E7EB",
  borderSoft: "#EDF0F4",
  borderStrong: "#D1D5DB",

  error: "#EF4444",
  errorSoft: "#FEE2E2",
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  info: "#3B82F6",
  infoSoft: "#DBEAFE",
} as const;

export const paletteDark = {
  primary: "#0080FF",
  primaryDark: "#0066CC",
  primaryLight: "#4DA6FF",
  primarySoft: "#0B2942",
  primaryTint: "#08192B",
  primaryText: "#7CC0FF",

  accent: "#2DD4A7",
  accentDark: "#14B8A6",

  background: "#0B1220",
  card: "#111A2B",
  surface: "#1F2937",
  surfaceHover: "#374151",

  text: "#F9FAFB",
  textSecondary: "#D1D5DB",
  textMuted: "#9CA3AF",

  border: "#374151",
  borderSoft: "#2A3441",
  borderStrong: "#4B5563",

  error: "#F87171",
  errorSoft: "#7F1D1D",
  success: "#34D399",
  successSoft: "#064E3B",
  warning: "#FBBF24",
  warningSoft: "#78350F",
  info: "#60A5FA",
  infoSoft: "#1E3A8A",
} as const;

/**
 * Escala de dor (0–10).
 *
 * Domínio clínico, não decoração: a mesma nota tem que ter a mesma cor na
 * agenda, na evolução e no laudo, senão o fisioterapeuta lê errado de relance.
 */
export const painScale = {
  0: "#9CA3AF",
  1: "#BEF264",
  3: "#FDE047",
  5: "#FDBA74",
  7: "#F87171",
  10: "#7F1D1D",
} as const;

export const painGauge = {
  low: "#22C55E",
  medium: "#EAB308",
  high: "#EF4444",
  severe: "#7F1D1D",
} as const;

/** Cor para uma nota de EVA. Interpola nas faixas da escala. */
export function painColor(score: number): string {
  const s = Math.max(0, Math.min(10, Math.round(score)));
  if (s === 0) return painScale[0];
  if (s <= 2) return painScale[1];
  if (s <= 4) return painScale[3];
  if (s <= 6) return painScale[5];
  if (s <= 8) return painScale[7];
  return painScale[10];
}

/** Status de agendamento — domínio, igual em toda superfície. */
export const appointmentStatus = {
  confirmed: "#10B981",
  pending: "#F59E0B",
  cancelled: "#EF4444",
  completed: "#3B82F6",
} as const;

/**
 * Raio base 16 — "clínico amigável", segundo o design system.
 * `sm`/`md` derivam dele exatamente como no CSS de origem.
 */
export const radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Escala alinhada ao Tailwind, como no CSS. */
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const fontFamily = {
  light: "Nunito-Light",
  regular: "Nunito-Regular",
  medium: "Nunito-Medium",
  semibold: "Nunito-SemiBold",
  bold: "Nunito-Bold",
  extrabold: "Nunito-ExtraBold",
} as const;

/** Escala tipográfica semântica, espelhando os h1..h6 e o corpo do CSS. */
export const typography = {
  h1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.56 },
  h2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.33 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 23 },
  h4: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22 },
  h5: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 22 },
  small: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 17 },
  xs: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 15 },
  /** Rótulo de seção: caixa alta, tracking largo. */
  eyebrow: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.88,
    textTransform: "uppercase" as const,
  },
} as const;

/**
 * Sombras.
 *
 * `none` é o padrão de card, de propósito: o design system pede superfície
 * chapada, com elevação reservada a popover e menu. Card de lista com sombra
 * é o erro mais comum ao portar este kit.
 */
export const shadow = {
  none: {},
  popover: {
    shadowColor: "#161718",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  sheet: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

/** Superfícies escuras de vídeo/câmera. */
export const media = {
  cameraBg: "#0E1320",
  videoBg: "#0F1420",
  silhouette: "#94A3B8",
} as const;

/** Cores sólidas de avatar por inicial — sem gradiente, conforme a marca. */
export const avatarColors = [
  "#0080FF",
  "#E8892B",
  "#D9457A",
  "#2DA860",
  "#7C5CD6",
  "#0D9488",
] as const;

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export const theme = {
  light: palette,
  dark: paletteDark,
  painScale,
  painGauge,
  appointmentStatus,
  radius,
  spacing,
  fontFamily,
  typography,
  shadow,
  media,
} as const;

export type ThemePalette = typeof palette;
