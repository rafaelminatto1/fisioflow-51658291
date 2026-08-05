/**
 * Cores da aplicação.
 *
 * Reexporta `constants/theme.ts`, a única tradução do `colors_and_type.css`
 * do design system. Este arquivo mantinha uma segunda paleta escrita à mão que
 * já divergia da de `constants/biomecanica.ts` — o azul batia, os cinzas não.
 *
 * O formato `Colors.light` / `Colors.dark` foi preservado porque dezenas de
 * telas dependem dele.
 */

import { palette, paletteDark } from "./theme";

/**
 * Valores como `string`, não literais.
 *
 * O `as const` do theme deixa cada cor com tipo literal, e aí `Colors.light` e
 * `Colors.dark` deixam de ser intercambiáveis — qualquer tela que escolhe a
 * paleta por tema em runtime para de compilar.
 */
export type ColorTokens = Record<keyof typeof palette | ColorAlias, string>;

type ColorAlias =
  | "secondary"
  | "errorLight"
  | "successLight"
  | "warningLight"
  | "infoLight"
  | "borderDark";

export const Colors: { light: ColorTokens; dark: ColorTokens } = {
  light: {
    ...palette,
    // aliases históricos, mantidos para não quebrar as telas existentes
    secondary: palette.accentDark,
    errorLight: palette.errorSoft,
    successLight: palette.successSoft,
    warningLight: palette.warningSoft,
    infoLight: palette.infoSoft,
    borderDark: palette.borderStrong,
  },
  dark: {
    ...paletteDark,
    secondary: paletteDark.accentDark,
    errorLight: paletteDark.errorSoft,
    successLight: paletteDark.successSoft,
    warningLight: paletteDark.warningSoft,
    infoLight: paletteDark.infoSoft,
    borderDark: paletteDark.borderStrong,
  },
};

export type ColorScheme = "light" | "dark";

