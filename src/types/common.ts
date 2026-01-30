/**
 * Common Type Definitions
 *
 * @description
 * Shared type definitions for frequently used patterns across the codebase.
 * These types replace `any` with proper TypeScript types.
 *
 * @module types/common
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * JSON-serializable value types
 * Use this instead of `any` for data that comes from/to JSON
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;

/**
 * JSON object with string keys
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * JSON array
 */
export type JsonArray = JsonValue[];

/**
 * Dictionary/Map type with unknown values
 * Use instead of `Record<string, any>`
 */
export type Dictionary<T = unknown> = Record<string, T>;

/**
 * Generic error handler type
 */
export type ErrorHandler = (error: Error) => void;
export type AsyncErrorHandler = (error: Error) => void | Promise<void>;

/**
 * Unknown error type - use instead of `error: any` in catch blocks
 */
export type UnknownError = unknown;

/**
 * Error with unknown type - narrow down to Error or extract message
 */
export function getErrorMessage(error: UnknownError): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}

/**
 * Narrow unknown error to Error instance
 */
export function asError(error: UnknownError): Error | null {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }
  return null;
}

/**
 * Icon component type
 * Use instead of `icon: any`
 */
export type IconComponent = ComponentType<{ className?: string; size?: number }>;
export type LucideIconType = LucideIcon;

/**
 * Event handler types for common UI patterns
 */
export type ValueChangeHandler<T = unknown> = (value: T) => void;
export type AsyncValueChangeHandler<T = unknown> = (value: T) => void | Promise<void>;

export type ChangeEventHandler<T = EventTarget> = (event: { target: T }) => void;

/**
 * Function type for async operations
 */
export type AsyncFunction<T = unknown, Args extends unknown[] = unknown[]> = (
  ...args: Args
) => Promise<T>;

/**
 * Promise result type
 */
export type PromiseResult<T> = Promise<T>;

/**
 * Type for timer/interval IDs
 */
export type TimerId = ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>;

/**
 * ID types - use these for entity IDs instead of `string` with `any`
 */
export type EntityId = string;
export type UserId = string;
export type PatientId = string;
export type AppointmentId = string;
export type ExerciseId = string;
export type OrganizationId = string;

/**
 * Timestamp type
 */
export type Timestamp = number; // milliseconds since epoch
export type IsoDateTime = string; // ISO 8601 datetime string

/**
 * Status types for common entities
 */
export type AppointmentStatus =
  | 'agendado'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'nao_compareceu'
  | 'remarcado'
  | 'aguardando_confirmacao'
  | 'bloqueado'
  | 'disponivel'
  | 'avaliacao'
  | 'retorno'
  | 'encaixe';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export type UserRole =
  | 'admin'
  | 'fisioterapeuta'
  | 'estagiario'
  | 'recepcionista'
  | 'paciente'
  | 'owner';

/**
 * Query parameter types
 */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/**
 * Pagination types
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Selection state type
 */
export type SelectionState<T> = {
  selected: Set<T>;
  toggle: (item: T) => void;
  isSelected: (item: T) => boolean;
  clear: () => void;
  selectAll: (items: T[]) => void;
};

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Filter operator types
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'nin';

/**
 * Generic filter type
 */
export interface Filter<T = unknown> {
  field: keyof T | string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Date range type
 */
export interface DateRange {
  start: Date | IsoDateTime;
  end: Date | IsoDateTime;
}

/**
 * File upload types
 */
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

/**
 * Toast/notification types
 */
export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Modal/dialog state
 */
export interface ModalState {
  isOpen: boolean;
  open: (data?: unknown) => void;
  close: () => void;
  toggle: () => void;
  data: unknown;
}

/**
 * Form state types
 */
export interface FormFieldError {
  message: string;
  path?: string;
}

export interface FormState<T = unknown> {
  values: T;
  errors: FormFieldError[];
  touched: Set<keyof T>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

/**
 * Component loading state
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = unknown, E = Error> {
  status: LoadingState;
  data: T | null;
  error: E | null;
}

/**
 * Color types
 */
export type ColorValue =
  | string
  | {
      r: number;
      g: number;
      b: number;
      a?: number;

    };

/**
 * Size variants for UI components
 */
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

/**
 * Position types
 */
export type Position = 'top' | 'right' | 'bottom' | 'left' | 'center';

/**
 * Alignment types
 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch';
export type AlignmentHorizontal = 'left' | 'center' | 'right' | 'justify';
export type AlignmentVertical = 'top' | 'middle' | 'bottom';

/**
 * CSS className type
 */
export type ClassName = string | undefined | null | false | ClassName[];

/**
 * Style prop type
 */
export type StyleProp = React.CSSProperties | undefined;

/**
 * Children type
 */
export type ChildrenProp = React.ReactNode;

/**
 * Ref type
 */
export type Ref<T> = React.Ref<T> | undefined;

/**
 * Key type for lists
 */
export type Key = string | number;

/**
 * Index type for arrays
 */
export type Index = number;

/**
 * Coordinates type
 */
export interface Coordinates {
  x: number;
  y: number;
}

/**
 * Dimensions type
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Bounding box type
 */
export interface BoundingBox extends Coordinates, Dimensions {}

/**
 * Percentage type (0-100)
 */
export type Percentage = number & { readonly __percentage: unique symbol };

/**
 * Create a percentage value (runtime validation)
 */
export function asPercentage(value: number): Percentage {
  if (value < 0 || value > 100) {
    throw new Error(`Percentage must be between 0 and 100, got ${value}`);
  }
  return value as Percentage;
}
