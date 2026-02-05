/**
 * Utility functions for color contrast and accessibility
 * Follows WCAG 2.1 guidelines for text contrast ratios
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Handle 3-character hex codes
    const fullHex = cleanHex.length === 3
        ? cleanHex.split('').map(c => c + c).join('')
        : cleanHex;

    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Calculate relative luminance according to WCAG 2.1
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
        const srgb = c / 255;
        return srgb <= 0.03928
            ? srgb / 12.92
            : Math.pow((srgb + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
export function getContrastRatio(luminance1: number, luminance2: number): number {
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Text color options with their hex values and luminance
 */
const TEXT_COLORS = {
    white: { hex: '#FFFFFF', luminance: 1 },
    offWhite: { hex: '#F8FAFC', luminance: 0.956 },
    lightGray: { hex: '#E2E8F0', luminance: 0.801 },
    gray: { hex: '#94A3B8', luminance: 0.356 },
    darkGray: { hex: '#475569', luminance: 0.114 },
    charcoal: { hex: '#1E293B', luminance: 0.031 },
    black: { hex: '#0F172A', luminance: 0.015 },
    pureBlack: { hex: '#000000', luminance: 0 },
};

/**
 * Get the optimal text color for a given background color
 * Returns the color with the best contrast ratio
 * WCAG AA requires 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA requires 7:1 for normal text, 4.5:1 for large text
 */
export function getOptimalTextColor(backgroundColor: string): string {
    const rgb = hexToRgb(backgroundColor);
    if (!rgb) return TEXT_COLORS.white.hex;

    const bgLuminance = getLuminance(rgb.r, rgb.g, rgb.b);

    // Test all text colors and find the one with best contrast
    let bestColor = TEXT_COLORS.white.hex;
    let bestContrast = 0;

    Object.values(TEXT_COLORS).forEach(({ hex, luminance }) => {
        const contrast = getContrastRatio(bgLuminance, luminance);
        if (contrast > bestContrast) {
            bestContrast = contrast;
            bestColor = hex;
        }
    });

    return bestColor;
}

/**
 * Get text color class based on background color
 * Returns appropriate Tailwind class or inline style
 */
export function getTextColorClass(backgroundColor: string): string {
    const textColor = getOptimalTextColor(backgroundColor);

    // Map to closest Tailwind class for common colors
    switch (textColor) {
        case TEXT_COLORS.white.hex:
        case TEXT_COLORS.offWhite.hex:
            return 'text-white';
        case TEXT_COLORS.lightGray.hex:
            return 'text-slate-200';
        case TEXT_COLORS.gray.hex:
            return 'text-slate-500';
        case TEXT_COLORS.darkGray.hex:
            return 'text-slate-600';
        case TEXT_COLORS.charcoal.hex:
            return 'text-slate-800';
        case TEXT_COLORS.black.hex:
        case TEXT_COLORS.pureBlack.hex:
            return 'text-slate-900';
        default:
            return 'text-white';
    }
}

/**
 * Determine if a color is "light" or "dark"
 * Useful for quick conditional styling
 */
export function isLightColor(color: string): boolean {
    const rgb = hexToRgb(color);
    if (!rgb) return false;

    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5;
}

/**
 * Get contrasting text style object for inline styles
 */
export function getContrastingTextStyle(backgroundColor: string): { color: string } {
    return { color: getOptimalTextColor(backgroundColor) };
}
