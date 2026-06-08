/**
 * Tema do módulo de Biomecânica (FisioFlow Pro mobile).
 * Recriação dos tokens do FisioFlow Design System para React Native:
 * fonte Nunito + paleta de domínio (azul Activity, dor, status, regiões).
 */

export const font = {
  regular: "Nunito-Regular",
  medium: "Nunito-Medium",
  semibold: "Nunito-SemiBold",
  bold: "Nunito-Bold",
  extrabold: "Nunito-ExtraBold",
} as const;

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
  // superfícies
  bg: "#F7F9FB",
  card: "#FFFFFF",
  border: "#E6E9EE",
  borderSoft: "#EDF0F4",
  fg: "#0B1220",
  muted: "#6B7280",
  mutedSoft: "#9AA3AF",

  // brand
  primary: "#0080FF",
  primaryDark: "#0066CC",
  primarySoft: "hsl(211, 100%, 93%)",
  primaryText: "hsl(211, 100%, 42%)",
  primaryTint: "hsl(211, 100%, 96%)",

  // status / domínio
  amberBg: "hsl(28, 92%, 93%)",
  amberText: "hsl(25, 72%, 42%)",
  greenBg: "hsl(142, 60%, 92%)",
  greenText: "hsl(142, 55%, 32%)",
  green: "hsl(142, 60%, 42%)",
  redBg: "hsl(0, 80%, 95%)",
  red: "hsl(0, 72%, 50%)",
  amber: "hsl(28, 90%, 52%)",

  // câmera / vídeo (fundos escuros)
  cameraBg: "#0E1320",
  videoBg: "#0F1420",
  silhouette: "#94A3B8",

  // avatares (cores sólidas por inicial)
  avatarBlue: "hsl(211, 100%, 50%)",
  avatarOrange: "hsl(28, 85%, 52%)",
  avatarPink: "hsl(340, 70%, 55%)",
  avatarGreen: "hsl(142, 50%, 44%)",
  avatarPurple: "hsl(264, 55%, 55%)",
} as const;

/** Escala de dor (VAS 0–10) do design system. */
export const painScale = [
  "#9ca3af",
  "#bef264",
  "#bef264",
  "#fde047",
  "#fde047",
  "#fdba74",
  "#fdba74",
  "#f87171",
  "#f87171",
  "#ef4444",
  "#7f1d1d",
];
