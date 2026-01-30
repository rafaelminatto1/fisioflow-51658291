/**
 * Route Prefetch Utility
 *
 * Prefetches route chunks when they're likely to be needed
 * to improve perceived performance and user experience.
 */

import { lazy, ComponentType } from 'react';

// Cache for prefetched components
const prefetchedCache = new Map<string, ComponentType<unknown>>();

// Track prefetch attempts to avoid duplicate calls
const prefetchAttempts = new Set<string>();

/**
 * Prefetch a lazy component
 * @param componentLoader The lazy component loader function
 * @param key Unique key for caching
 */
export async function prefetchRoute(
  componentLoader: () => Promise<{ default: ComponentType<unknown> }>,
  key: string
): Promise<void> {
  // Check if already prefetched
  if (prefetchedCache.has(key)) {
    return;
  }

  // Check if currently prefetching
  if (prefetchAttempts.has(key)) {
    return;
  }

  prefetchAttempts.add(key);

  try {
    const module = await componentLoader();
    prefetchedCache.set(key, module.default);
  } catch (error) {
    // Remove from attempts on failure so we can retry
    prefetchAttempts.delete(key);
  }
}

/**
 * Check if a route has been prefetched
 */
export function isRoutePrefetched(key: string): boolean {
  return prefetchedCache.has(key);
}

/**
 * Clear prefetch cache (useful for testing or memory management)
 */
export function clearPrefetchCache(): void {
  prefetchedCache.clear();
  prefetchAttempts.clear();
}

/**
 * Get prefetch stats
 */
export function getPrefetchStats(): { prefetched: number; pending: number } {
  return {
    prefetched: prefetchedCache.size,
    pending: prefetchAttempts.size - prefetchedCache.size,
  };
}

// ============================================================================
// COMMONLY ACCESSED ROUTES - Preload on hover
// ============================================================================

/**
 * Route keys for commonly accessed pages
 */
export const RouteKeys = {
  // Core pages
  DASHBOARD: 'dashboard',
  PATIENTS: 'patients',
  SCHEDULE: 'schedule',
  EXERCISES: 'exercises',
  FINANCIAL: 'financial',
  REPORTS: 'reports',
  SETTINGS: 'settings',

  // Patient-related
  PATIENT_PROFILE: 'patient-profile',
  PATIENT_EVOLUTION: 'patient-evolution',
  MEDICAL_RECORD: 'medical-record',

  // Clinical
  COMMUNICATIONS: 'communications',
  TELEMEDICINE: 'telemedicine',
  SMART_DASHBOARD: 'smart-dashboard',

  // Admin
  USER_MANAGEMENT: 'admin-users',
  ORGANIZATION_SETTINGS: 'admin-organization',
  SECURITY_SETTINGS: 'settings-security',
} as const;

/**
 * Prefetch strategy based on user behavior
 */
export const PrefetchStrategy = {
  /**
   * Prefetch on hover (for navigation links)
   */
  onHover: (routeKey: string, loader: () => Promise<{ default: ComponentType<unknown> }>) => ({
    onMouseEnter: () => {
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback?: (callback: () => void) => void }).requestIdleCallback(() => prefetchRoute(loader, routeKey));
      } else {
        setTimeout(() => prefetchRoute(loader, routeKey), 100);
      }
    },
  }),

  /**
   * Prefetch on mount (for likely next routes)
   */
  onMount: (routeKey: string, loader: () => Promise<{ default: ComponentType<unknown> }>) => {
    // Delay prefetch to avoid blocking initial render
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback?: (callback: () => void) => void }).requestIdleCallback(() => prefetchRoute(loader, routeKey));
    } else {
      setTimeout(() => prefetchRoute(loader, routeKey), 2000);
    }
  },

  /**
   * Prefetch immediately (for critical routes)
   */
  immediate: (routeKey: string, loader: () => Promise<{ default: ComponentType<unknown> }>) => {
    prefetchRoute(loader, routeKey);
  },
};

/**
 * Intelligent prefetch strategy based on current route
 */
export function prefetchRelatedRoutes(currentRoute: string): void {
  // Define related routes for each section
  const routeMap: Record<string, string[]> = {
    '/patients': ['/schedule', '/exercises', '/medical-record'],
    '/schedule': ['/patients', '/waitlist'],
    '/financial': ['/reports', '/patients'],
    '/patients/:id': ['/patient-evolution/:appointmentId', '/medical-record'],
    '/settings': ['/admin/users', '/security-settings'],
  };

  // Find matching routes and prefetch them
  for (const [route, relatedRoutes] of Object.entries(routeMap)) {
    if (currentRoute.startsWith(route.replace(/:[^/]+/g, ''))) {
      relatedRoutes.forEach(relatedRoute => {
        // This would be used with actual route loaders in a real implementation
        // For now, it's a placeholder for the prefetching strategy
      });
    }
  }
}

/**
 * Hook to prefetch routes on component mount
 */
export function usePrefetchRoutes(
  routes: Array<{ key: string; loader: () => Promise<{ default: ComponentType<unknown> }> }>,
  strategy: 'immediate' | 'idle' | 'delayed' = 'idle'
) {
  // This would be used in React components
  // Implementation depends on whether we're using React.lazy or custom loaders
}

/**
 * Webpack chunk names for debugging
 * These match the webpackChunkName comments in routes.tsx
 */
export const ChunkNames = {
  // Auth
  'auth-welcome': 'Welcome page',
  auth: 'Authentication page',

  // Core
  dashboard: 'Dashboard',
  patients: 'Patients list',
  schedule: 'Schedule/Calendar',
  exercises: 'Exercises',
  financial: 'Financial',
  reports: 'Reports',
  settings: 'Settings',
  profile: 'User profile',
  'medical-record': 'Medical record',

  // Features
  'smart-dashboard': 'Smart dashboard',
  'ai-smart': 'Smart AI',
  physiotherapy: 'Physiotherapy hub',
  telemedicine: 'Telemedicine',
  'telemedicine-room': 'Telemedicine room',
  'exercises-library': 'Exercise library',
  biofeedback: 'Biofeedback',
  'patient-evolution': 'Patient evolution',
  'patient-evolution-report': 'Evolution report',
  'session-evolution': 'Session evolution',
  'pain-maps': 'Pain maps',
  'evaluation-new': 'New evaluation',
  'patient-profile': 'Patient profile',
  communications: 'Communications',

  // Settings
  'settings-schedule': 'Schedule settings',
  'settings-calendar': 'Calendar settings',
  'settings-security': 'Security settings',

  // Registration (Cadastros)
  'cadastros-services': 'Services registration',
  'cadastros-suppliers': 'Suppliers registration',
  'cadastros-holidays': 'Holidays registration',
  'cadastros-certificates': 'Certificates registration',
  'cadastros-contracts': 'Contracts registration',
  'cadastros-templates': 'Templates registration',
  'cadastros-forms': 'Forms registration',
  'cadastros-form-builder': 'Form builder',
  'cadastros-objectives': 'Objectives registration',

  // Financial
  'financial-accounts': 'Financial accounts',
  'financial-cashflow': 'Cash flow',

  // Reports
  'reports-birthdays': 'Birthdays report',
  'reports-attendance': 'Attendance report',
  'reports-team': 'Team performance',

  // Advanced
  'vouchers-partners': 'Partners',
  vouchers: 'Vouchers',
  install: 'Install',
  waitlist: 'Waitlist',
  surveys: 'Surveys',
  tasks: 'Tasks',
  inventory: 'Inventory',
  protocols: 'Protocols',

  // Events
  events: 'Events',
  'events-detail': 'Event details',
  'events-analytics': 'Events analytics',

  // Admin
  'admin-users': 'User management',
  'admin-audit': 'Audit logs',
  'admin-invitations': 'Invitations',
  'admin-security': 'Security monitoring',
  'admin-crud': 'Admin CRUD',
  'admin-organization': 'Organization settings',
  'admin-analytics': 'Admin analytics',
  'analytics-advanced': 'Advanced analytics',
  'analytics-cohorts': 'Cohort analysis',
  'api-docs': 'API documentation',

  // Gamification
  'gamification-patient': 'Patient gamification',
  'gamification-admin': 'Admin gamification',

  // Goals
  'goals-list': 'Goals list',
  'goals-editor': 'Goals editor',

  // AI
  'ai-chatbot': 'Medical chatbot',
  'ai-computer-vision': 'Computer vision',
  'ai-intelligent-reports': 'Intelligent reports',
  'ai-ar': 'Augmented reality',

  // Analysis
  'analysis-images': 'Image analysis',
  'analysis-dynamic': 'Dynamic comparison',

  // CRM
  'crm-leads': 'Leads',
  'crm-dashboard': 'CRM dashboard',
  'portal-patient': 'Patient portal',

  // Misc
  notifications: 'Notifications',
  occupancy: 'Therapist occupancy',
  'prescription-public': 'Public prescription',
  'test-upload': 'Upload test',
  'clinical-tests': 'Clinical tests',
  'not-found': 'Not found',
} as const;
