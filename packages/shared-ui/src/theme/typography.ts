/**
 * FisioFlow Design System - Typography Tokens
 *
 * Typography scale based on 8pt grid system
 * Font family: Inter (Google Fonts)
 */

export const typography = {
  // Font Families
  fontFamily: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
  },

  // Font Sizes (scale based on major third: 1.250)
  fontSize: {
    xs: 12,      // 0.75rem
    sm: 14,      // 0.875rem
    base: 16,    // 1rem
    lg: 18,      // 1.125rem
    xl: 20,      // 1.25rem
    '2xl': 24,   // 1.5rem
    '3xl': 30,   // 1.875rem
    '4xl': 36,   // 2.25rem
    '5xl': 48,   // 3rem
    '6xl': 60,   // 3.75rem
  },

  // Font Weights
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },

  // Line Heights (optimal for readability)
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },

  // Text Styles (predefined combinations)
  textStyles: {
    // Display
    displayLarge: {
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
      fontFamily: 'Inter_700Bold',
    },
    displayMedium: {
      fontSize: 30,
      fontWeight: '700' as const,
      lineHeight: 38,
      fontFamily: 'Inter_700Bold',
    },
    displaySmall: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      fontFamily: 'Inter_700Bold',
    },

    // Headline
    headlineLarge: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      fontFamily: 'Inter_600SemiBold',
    },
    headlineMedium: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 26,
      fontFamily: 'Inter_600SemiBold',
    },
    headlineSmall: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
      fontFamily: 'Inter_600SemiBold',
    },

    // Title
    titleLarge: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
      fontFamily: 'Inter_500Medium',
    },
    titleMedium: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      fontFamily: 'Inter_500Medium',
    },
    titleSmall: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      fontFamily: 'Inter_500Medium',
    },

    // Body
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      fontFamily: 'Inter_400Regular',
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
      fontFamily: 'Inter_400Regular',
    },

    // Label
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      fontFamily: 'Inter_500Medium',
    },
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      fontFamily: 'Inter_500Medium',
    },
    labelSmall: {
      fontSize: 11,
      fontWeight: '500' as const,
      lineHeight: 16,
      fontFamily: 'Inter_500Medium',
    },
  },
} as const;

export type TextStyleKey = keyof typeof typography.textStyles;
export type FontFamily = keyof typeof typography.fontFamily;
export type FontSize = keyof typeof typography.fontSize;
