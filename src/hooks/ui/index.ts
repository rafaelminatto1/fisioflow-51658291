/**
 * FisioFlow - UI Hooks
 *
 * Este módulo centraliza todos os hooks relacionados a UI/UX.
 *
 * @module hooks/ui
 */

// ============================================================================
// Viewport & Visibility Hooks
// ============================================================================

// Hook de elemento visível na viewport
export { useInView } from "./useInView";

// Hook de preload de imagens
export { useImagePreload, useImagesPreload } from "./useImagePreload";

// ============================================================================
// Virtualization Hooks
// ============================================================================

// Hook de lista virtualizada
export { useVirtualizedList } from "./useVirtualizedList";

// ============================================================================
// Command Palette
// ============================================================================

// Hook de paleta de comandos
export { useCommandPalette } from "./useCommandPalette";

// ============================================================================
// Media & Responsive Hooks (from root hooks)
// ============================================================================

// Hook de detecção mobile
export { useMobile } from "../use-mobile";

// Hook de media query
export { useMediaQuery } from "../use-media-query";

// ============================================================================
// Interaction Hooks (from root hooks)
// ============================================================================

// Hook de debounce
export { useDebounce } from "../useDebounce";
export { useDebounce as useDebounceAlt } from "../use-debounce";

// Hook de touch
export { useTouch } from "../use-touch";

// ============================================================================
// Form Hooks (from root hooks)
// ============================================================================

// Hook de campo de formulário
export { useFormField } from "../useFormField";

// ============================================================================
// Toast & Notifications (from root hooks)
// ============================================================================

// Hook de toast
export { useToast, toast } from "../use-toast";

// ============================================================================
// Accessibility Hooks (from accessibility subfolder)
// ============================================================================

export { useMainContentProps } from "../accessibility/useMainContentProps";
export {
	useFocusVisibleHandler,
	useFocusClassName,
} from "../accessibility/useFocusVisibleHandler";

// ============================================================================
// Performance Hooks (from root hooks)
// ============================================================================

// Hook de throttle
export {
	useThrottle,
	useThrottleFn,
	useThrottleCallback,
	useRAFThrottle,
} from "../useThrottle";

// Hook de intersection observer
export {
	useIntersectionObserver,
	useIntersectionObserverCallback,
	useMultipleIntersectionObserver,
	useVisibilityRatio,
	useInfiniteScroll,
	useOnScreenExit,
} from "../useIntersectionObserver";

// Hook de interval e timeout
export { useInterval, useTimeout } from "../useInterval";

// ============================================================================
// Lazy Loading Hooks (from root hooks)
// ============================================================================

export { useLazyImage } from "../useLazyImage";

// ============================================================================
// Card Size Hook
// ============================================================================

export { useCardSize } from "../useCardSize";

// ============================================================================
// Keyboard Hooks (from root hooks)
// ============================================================================

export { useGlobalShortcuts } from "../useGlobalShortcuts";
