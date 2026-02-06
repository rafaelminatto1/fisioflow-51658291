/**
 * Componentes de Acessibilidade
 *
 * Conjunto de componentes e utilitários para melhorar a acessibilidade da aplicação
 * conforme as diretrizes WCAG 2.1 AA
 */

export { SkipLink } from './SkipLink';
export { MainContentProps, useMainContentProps } from '@/hooks/accessibility/useMainContentProps';
export { FocusVisibleHandler } from './FocusVisibleHandler';
export { useFocusVisibleHandler, useFocusClassName } from '@/hooks/accessibility/useFocusVisibleHandler';
