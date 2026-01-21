/**
 * Shared UI Components - Index
 *
 * Componentes cross-platform que funcionam tanto em web quanto em mobile
 */

// Layout components
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
export type { BaseCardProps } from './card';

// Form components
export { Button } from './button';
export type { SharedButtonProps } from './button';

export { Input } from './input';
export type { SharedInputProps } from './input';

export { Textarea } from './textarea';
export type { SharedTextareaProps } from './textarea';

export { Label } from './label';
export type { SharedLabelProps } from './label';

export { Checkbox } from './checkbox';
export type { SharedCheckboxProps } from './checkbox';

export { Switch } from './switch';
export type { SharedSwitchProps } from './switch';

export { Slider } from './slider';
export type { SharedSliderProps } from './slider';

export { Select } from './select';
export type { SharedSelectProps, SharedSelectOption } from './select';

// Feedback components
export { Badge } from './badge';
export type { SharedBadgeProps } from './badge';

export { Alert, AlertTitle, AlertDescription } from './alert';
export type { SharedAlertProps } from './alert';

export { Progress } from './progress';
export type { SharedProgressProps } from './progress';

export { Skeleton } from './skeleton';
export type { SharedSkeletonProps } from './skeleton';

// Navigation components
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export type { SharedTabsProps } from './tabs';

// Disclosure components
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export type { SharedAccordionProps } from './accordion';

// Overlay components
export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
export type { SharedDialogProps } from './dialog';

export { Popover, PopoverTrigger, PopoverContent } from './popover';
export type { SharedPopoverProps } from './popover';

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './tooltip';
export type { SharedTooltipProps } from './tooltip';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './dropdown-menu';
export type { SharedDropdownMenuProps } from './dropdown-menu';

// Typography
export {
  Text,
  H1,
  H2,
  H3,
  H4,
  P,
  Label,
  Muted,
  Lead,
} from './text';
export type { TextProps, TextVariant } from './text';

// Miscellaneous
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export type { SharedAvatarProps } from './avatar';

export { Separator } from './separator';
export type { SharedSeparatorProps } from './separator';
