import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
  hapticError,
  hapticSelection,
} from '@/lib/haptics';

/**
 * Hook simplificado para feedback tátil (haptics)
 *
 * Uso:
 * ```tsx
 * const { light, medium, heavy, success, error } = useHaptics();
 *
 * <Button onPress={() => {
 *   medium(); // Feedback ao tocar
 *   // ... lógica
 *   success(); // Feedback de sucesso
 * }} />
 * ```
 */
export function useHaptics() {
  return {
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    success: hapticSuccess,
    warning: hapticWarning,
    error: hapticError,
    selection: hapticSelection,
  };
}
