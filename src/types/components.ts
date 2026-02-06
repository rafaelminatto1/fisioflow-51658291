/**
 * Component Type Definitions
 *
 * @description
 * Shared type definitions for React component props.
 * Use these types for component props instead of `any`.
 *
 * @module types/components
 */


/**
 * Base component props
 */

import type { ReactNode, MouseEvent } from 'react';
import type { ClassName, IconComponent, StyleProp, EntityId } from './common';

export interface BaseComponentProps {
  /**
   * CSS className to apply
   */
  className?: ClassName;

  /**
   * Inline styles
   */
  style?: StyleProp;

  /**
   * Unique ID for the component
   */
  id?: string;

  /**
   * Test ID for testing purposes
   */
  'data-testid'?: string;
}

/**
 * Clickable component props
 */
export interface ClickableProps extends BaseComponentProps {
  /**
   * Click handler
   */
  onClick?: (event: MouseEvent<HTMLElement>) => void;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * ARIA label for accessibility
   */
  'aria-label'?: string;

  /**
   * ARIA describedby
   */
  'aria-describedby'?: string;
}

/**
 * Icon component props
 */
export interface IconProps extends BaseComponentProps {
  /**
   * Icon component (Lucide icon)
   */
  icon: IconComponent;

  /**
   * Icon size
   */
  size?: number | string;

  /**
   * Icon color
   */
  color?: string;
}

/**
 * Status badge props
 */
export interface StatusBadgeProps extends BaseComponentProps {
  /**
   * Status text
   */
  status: string;

  /**
   * Status variant for styling
   */
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';

  /**
   * Show icon
   */
  showIcon?: boolean;
}

/**
 * Card component props
 */
export interface CardProps extends BaseComponentProps, ClickableProps {
  /**
   * Card content
   */
  children: ReactNode;

  /**
   * Card variant
   */
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';

  /**
   * Card padding
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Hover effect
   */
  hoverable?: boolean;
}

/**
 * List item props
 */
export interface ListItemProps extends BaseComponentProps, ClickableProps {
  /**
   * Item content
   */
  children: ReactNode;

  /**
   * Active state
   */
  active?: boolean;

  /**
   * Selected state
   */
  selected?: boolean;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Item value
   */
  value?: unknown;
}

/**
 * Table column definition
 */
export interface TableColumn<T = unknown> {
  /**
   * Column key/ID
   */
  key: string;

  /**
   * Column header
   */
  header: string;

  /**
   * Render function for cell
   */
  render?: (value: unknown, row: T, index: number) => ReactNode;

  /**
   * Sortable
   */
  sortable?: boolean;

  /**
   * Filterable
   */
  filterable?: boolean;

  /**
   * Column width
   */
  width?: string | number;

  /**
   * Text alignment
   */
  align?: 'left' | 'center' | 'right';
}

/**
 * Table props
 */
export interface TableProps<T = unknown> extends BaseComponentProps {
  /**
   * Table data
   */
  data: T[];

  /**
   * Column definitions
   */
  columns: TableColumn<T>[];

  /**
   * Row key extractor
   */
  rowKey?: keyof T | ((row: T, index: number) => EntityId);

  /**
   * Sortable
   */
  sortable?: boolean;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * On row click
   */
  onRowClick?: (row: T, index: number) => void;

  /**
   * On sort change
   */
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;
}

/**
 * Form field props
 */
export interface FormFieldProps<T = unknown> extends BaseComponentProps {
  /**
   * Field name
   */
  name: string;

  /**
   * Field label
   */
  label?: string;

  /**
   * Field value
   */
  value: T;

  /**
   * On change handler
   */
  onChange: (value: T) => void;

  /**
   * On blur handler
   */
  onBlur?: () => void;

  /**
   * On focus handler
   */
  onFocus?: () => void;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Required field
   */
  required?: boolean;

  /**
   * Error message
   */
  error?: string;

  /**
   * Help text
   */
  helpText?: string;

  /**
   * Placeholder
   */
  placeholder?: string;
}

/**
 * Select option props
 */
export interface SelectOption<T = unknown> {
  /**
   * Option value
   */
  value: T;

  /**
   * Option label
   */
  label: string;

  /**
   * Option disabled
   */
  disabled?: boolean;

  /**
   * Additional data
   */
  data?: Record<string, unknown>;
}

/**
 * Select component props
 */
export interface SelectProps<T = unknown> extends FormFieldProps<T> {
  /**
   * Available options
   */
  options: SelectOption<T>[];

  /**
   * Placeholder
   */
  placeholder?: string;

  /**
   * Clearable
   */
  clearable?: boolean;

  /**
   * Searchable
   */
  searchable?: boolean;

  /**
   * Multiple selection
   */
  multiple?: boolean;

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * On search
   */
  onSearch?: (query: string) => void;
}

/**
 * Modal/Dialog props
 */
export interface ModalProps extends BaseComponentProps {
  /**
   * Open state
   */
  isOpen: boolean;

  /**
   * On close
   */
  onClose: () => void;

  /**
   * Modal content
   */
  children: ReactNode;

  /**
   * Modal title
   */
  title?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /**
   * Close on overlay click
   */
  closeOnOverlayClick?: boolean;

  /**
   * Close on ESC
   */
  closeOnEsc?: boolean;

  /**
   * Show close button
   */
  showCloseButton?: boolean;

  /**
   * Footer content
   */
  footer?: ReactNode;
}

/**
 * Dropdown menu item
 */
export interface MenuItem {
  /**
   * Item key/ID
   */
  key: string;

  /**
   * Item label
   */
  label: string;

  /**
   * Item icon
   */
  icon?: IconComponent;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Destructive action
   */
  destructive?: boolean;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Nested items
   */
  items?: MenuItem[];
}

/**
 * Dropdown props
 */
export interface DropdownProps extends BaseComponentProps, ClickableProps {
  /**
   * Trigger element
   */
  trigger: ReactNode;

  /**
   * Menu items
   */
  items: MenuItem[];

  /**
   * Open state (controlled)
   */
  isOpen?: boolean;

  /**
   * On open change
   */
  onOpenChange?: (isOpen: boolean) => void;

  /**
   * Dropdown placement
   */
  placement?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Align dropdown
   */
  align?: 'start' | 'center' | 'end';
}

/**
 * Tooltip props
 */
export interface TooltipProps extends BaseComponentProps {
  /**
   * Tooltip content
   */
  content: ReactNode;

  /**
   * Trigger element
   */
  children: ReactNode;

  /**
   * Placement
   */
  placement?: 'top' | 'bottom' | 'left' | 'right';

  /**
   * Delay in ms
   */
  delay?: number;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Arrow visible
   */
  arrow?: boolean;
}

/**
 * Loading state props
 */
export interface LoadingProps extends BaseComponentProps {
  /**
   * Loading state
   */
  loading: boolean;

  /**
   * Overlay
   */
  overlay?: boolean;

  /**
   * Loading message
   */
  message?: string;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Empty state props
 */
export interface EmptyStateProps extends BaseComponentProps {
  /**
   * Empty state icon
   */
  icon?: IconComponent;

  /**
   * Title
   */
  title?: string;

  /**
   * Description
   */
  description?: string;

  /**
   * Action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Error state props
 */
export interface ErrorStateProps extends BaseComponentProps {
  /**
   * Error object
   */
  error: Error | unknown;

  /**
   * Error message override
   */
  message?: string;

  /**
   * On retry
   */
  onRetry?: () => void;
}

/**
 * Progress bar props
 */
export interface ProgressBarProps extends BaseComponentProps {
  /**
   * Progress value (0-100)
   */
  value: number;

  /**
   * Show label
   */
  showLabel?: boolean;

  /**
   * Variant
   */
  variant?: 'default' | 'success' | 'warning' | 'error';

  /**
   * Animated
   */
  animated?: boolean;

  /**
   * Striped
   */
  striped?: boolean;
}

/**
 * Accordion item props
 */
export interface AccordionItemProps {
  /**
   * Item key/ID
   */
  key: string;

  /**
   * Item title
   */
  title: string;

  /**
   * Item content
   */
  content: ReactNode;

  /**
   * Icon
   */
  icon?: IconComponent;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Initially expanded
   */
  defaultExpanded?: boolean;
}

/**
 * Tabs props
 */
export interface TabProps {
  /**
   * Tab key/ID
   */
  key: string;

  /**
   * Tab label
   */
  label: string;

  /**
   * Tab icon
   */
  icon?: IconComponent;

  /**
   * Tab content
   */
  content: ReactNode;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Badge count
   */
  badge?: number;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  /**
   * Item label
   */
  label: string;

  /**
   * Item href
   */
  href?: string;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Current page
   */
  current?: boolean;
}

/**
 * Skeleton loader props
 */
export interface SkeletonProps extends BaseComponentProps {
  /**
   * Number of skeletons to render
   */
  count?: number;

  /**
   * Height
   */
  height?: string | number;

  /**
   * Width
   */
  width?: string | number;

  /**
   * Circle shape
   */
  circle?: boolean;

  /**
   * Animation variant
   */
  animation?: 'pulse' | 'wave' | 'none';
}
