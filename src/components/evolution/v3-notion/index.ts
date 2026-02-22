/**
 * V3-Notion Evolution Components Index
 *
 * Exports all components from the V3-Notion evolution panel implementation.
 */

// Main Panel
export { NotionEvolutionPanel, MemoizedNotionEvolutionPanel } from './NotionEvolutionPanel';

// Section Components
export { NotionSectionTitle } from './NotionSectionTitle';

// Types
export type { EvolutionV2Data, EvolutionVersion } from './types';

// Utility Components
export { QuickPainSlider } from './QuickPainSlider';
export { TemplateSelector, type SOAPTemplate } from './TemplateSelector';
export { ExerciseQuickAdd, type Exercise } from './ExerciseQuickAdd';
export { CompactSection, MemoizedCompactSection, CompactViewToggle, useCompactView, CompactViewProvider } from './CompactViewMode';
export { StickySectionHeader, MemoizedStickySectionHeader } from './StickySectionHeader';
export { ContextualSectionEmphasis, MemoizedContextualSectionEmphasis, useSectionEmphasisConfigs, type EmphasisLevel, type SectionEmphasisConfig } from './ContextualSectionEmphasis';
export { VirtualizedBlockRenderer, MemoizedVirtualizedBlockRenderer, createVirtualBlock, type VirtualBlock } from './VirtualizedBlockRenderer';
export { AdaptiveSectionCollapse, MemoizedAdaptiveSectionCollapse } from './AdaptiveSectionCollapse';
export { MobileBottomSheet, useMobileSheet, MobileSheetProvider, MobileSheetWrapper, ExerciseSheetWrapper, MeasurementsSheetWrapper } from './MobileBottomSheet';
export { ProgressTrending, CompactTrend, useTrendData, type TrendData, type DataPoint } from './ProgressTrending';
