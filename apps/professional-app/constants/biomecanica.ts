/**
 * Tema do módulo de Biomecânica.
 *
 * As cores base vêm de `constants/theme.ts`, a única tradução do
 * `colors_and_type.css` do design system. Este arquivo mantém só o que é
 * específico do módulo (tons por região corporal) e os nomes de export que as
 * telas já usam.
 *
 * Antes daqui e de `constants/colors.ts` serem duas paletas paralelas — e elas
 * já divergiam: o azul batia, os cinzas não.
 */

import { fontFamily, media, painColor, palette, radius, spacing } from "./theme";

export { painColor, radius, spacing };

export const font = fontFamily;

/** Mapa para expo-font useFonts() */
export const nunitoFonts = {
  "Nunito-Regular": require("../assets/fonts/Nunito-Regular.ttf"),
  "Nunito-Medium": require("../assets/fonts/Nunito-Medium.ttf"),
  "Nunito-SemiBold": require("../assets/fonts/Nunito-SemiBold.ttf"),
  "Nunito-Bold": require("../assets/fonts/Nunito-Bold.ttf"),
  "Nunito-ExtraBold": require("../assets/fonts/Nunito-ExtraBold.ttf"),
};

/** Paleta de domínio — espelha as cores HSL do design system. */
export const bio = {
  // superfícies — do theme
  bg: palette.background,
  card: palette.card,
  border: palette.border,
  borderSoft: palette.borderSoft,
  fg: palette.text,
  muted: palette.textSecondary,
  mutedSoft: palette.textMuted,

  // brand — do theme
  primary: palette.primary,
  primaryDark: palette.primaryDark,
  primarySoft: palette.primarySoft,
  primaryText: palette.primaryText,
  primaryTint: palette.primaryTint,

  // status / domínio
  amberBg: "hsl(28, 92%, 93%)",
  amberText: "hsl(25, 72%, 42%)",
  greenBg: "hsl(142, 60%, 92%)",
  greenText: "hsl(142, 55%, 32%)",
  green: "hsl(142, 60%, 42%)",
  redBg: "hsl(0, 80%, 95%)",
  red: "hsl(0, 72%, 50%)",
  amber: "hsl(28, 90%, 52%)",

  // câmera / vídeo — do theme
  cameraBg: media.cameraBg,
  videoBg: media.videoBg,
  silhouette: media.silhouette,

  // avatares (cores sólidas por inicial)
  avatarBlue: "hsl(211, 100%, 50%)",
  avatarOrange: "hsl(28, 85%, 52%)",
  avatarPink: "hsl(340, 70%, 55%)",
  avatarGreen: "hsl(142, 50%, 44%)",
  avatarPurple: "hsl(264, 55%, 55%)",

  // Categorias do Design System Handoff (colors_and_type.css)
  cOrto: "hsl(211, 100%, 50%)",
  cOrtoBg: "hsl(211, 100%, 94%)",
  cOrtoText: "hsl(211, 100%, 38%)",

  cSport: "hsl(264, 55%, 55%)",
  cSportBg: "hsl(264, 55%, 94%)",
  cSportText: "hsl(264, 55%, 42%)",

  cPosOp: "hsl(158, 62%, 40%)",
  cPosOpBg: "hsl(158, 62%, 93%)",
  cPosOpText: "hsl(158, 62%, 30%)",

  cCustom: "hsl(38, 92%, 50%)",
  cCustomBg: "hsl(38, 92%, 93%)",
  cCustomText: "hsl(38, 85%, 35%)",

  cDor: "hsl(0, 74%, 58%)",
  cDorBg: "hsl(0, 74%, 95%)",
  cDorText: "hsl(0, 74%, 40%)",
} as const;

/**
 * Escala de dor indexada pela nota (0–10).
 * Derivada de `painColor()` para não existir uma segunda definição: a mesma
 * nota tem que ter a mesma cor na agenda, na evolução e no laudo.
 */
export const painScale = Array.from({ length: 11 }, (_, nota) => painColor(nota));

/** Sombras padronizadas do Design System Handoff */
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  glowPrimary: {
    shadowColor: "#0080FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
};

