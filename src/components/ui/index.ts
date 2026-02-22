export { Accordion } from './accordion';
export { AlertDialog } from './alert-dialog';
export { Alert } from './alert';
export { EmptyState } from './empty-state';
export { LoadingSkeleton } from './loading-skeleton';
export { ResponsiveTable } from './responsive-table';
export { AspectRatio } from './aspect-ratio';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Badge } from './badge';
export { badgeVariants } from '@/lib/ui-variants';
export * from './breadcrumb';
export { PageBreadcrumbs } from './page-breadcrumbs';

// ============================================================================
// Theme System (Fase 4: UX/UI Enhancements)
// ============================================================================

export { ThemeProvider, useTheme, ThemeControls, ThemeSettings } from './theme/ThemeProvider';
export type {
  ThemePreferences,
  ColorScheme,
  FontSize,
  AnimationSpeed,
  ThemeContextValue
} from './theme/ThemeProvider';

// ============================================================================
// Accessibility Components (Fase 4: UX/UI Enhancements)
// ============================================================================

export {
  SkipLinks,
  LiveRegion,
  Announcement,
  SrOnly,
  FocusTrap
} from './accessibility/SkipLinks';
export type {
  SkipLink,
  LiveRegionProps,
  AnnouncementProps,
  SrOnlyProps,
  FocusTrapProps
} from './accessibility/SkipLinks';

// ============================================================================
// Responsive Components (Fase 4: UX/UI Enhancements)
// ============================================================================
// NOTE: ResponsiveContainer and related components are not yet implemented.
// These will be added in future iterations.

// export {
//   ResponsiveContainer,
//   Show,
//   Hide,
//   Grid,
//   Flex,
//   ResponsiveText,
//   BREAKPOINTS,
//   useBreakpoint,
//   useBreakpointValue,
//   useMediaQuery,
//   useIsMobile,
//   useIsTablet,
//   useIsDesktop,
//   useIsLandscape,
//   useIsPortrait,
//   useIsTouch,
//   useIsPrint,
//   usePrefersReducedMotion,
//   usePrefersHighContrast,
//   type Breakpoint,
//   type ResponsiveValue,
//   type ResponsiveContainerProps,
//   type ShowProps,
//   type GridProps,
//   type FlexProps,
//   type ResponsiveTextProps
// } from './responsive/ResponsiveContainer';

// ============================================================================
// Rich Text Editor
// ============================================================================

export { RichTextEditor } from './RichTextEditor';
export { RichTextToolbar } from './RichTextToolbar';

// ============================================================================
// Performance Monitor
// ============================================================================

export { PerformanceMonitor } from './PerformanceMonitor';

// ============================================================================
// Empty State
// ============================================================================

export { EmptyStateEnhanced } from './EmptyStateEnhanced';
export type { EmptyStateVariant } from './EmptyStateEnhanced';
export { Button } from './button';
export { buttonVariants } from '@/lib/ui-variants';
export { Calendar } from './calendar';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export * from './carousel';
export * from './chart';
export { Checkbox } from './checkbox';
export * from './collapsible';
export { Command } from './command';
export { ContextMenu } from './context-menu';
export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './dialog';
export * from './drawer';
export * from './dropdown-menu';
export { FileUpload } from './file-upload';
export * from './form';
export { HoverCard } from './hover-card';
export { Input } from './input';
export { Label } from './label';
export { Menubar } from './menubar';
export { NavigationMenu } from './navigation-menu';
export { Pagination } from './pagination';
export { Popover } from './popover';
export { Progress } from './progress';
export { RadioGroup } from './radio-group';
export * from './resizable';
export { ScrollArea } from './scroll-area';
export { Select } from './select';
export { Separator } from './separator';
export { Sheet } from './sheet';
export * from './sidebar';
export { Skeleton } from './skeleton';
export { Slider } from './slider';
export { OptimizedImage } from './OptimizedImage';
export { OptimizedSupabaseImage } from './OptimizedSupabaseImage';
export { Switch } from './switch';
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from './table';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Textarea } from './textarea';
export * from './toggle-group';
export * from './toggle';
export { Tooltip } from './tooltip';
export { toast, useToast } from './use-toast';
export { Toaster } from './toaster';
