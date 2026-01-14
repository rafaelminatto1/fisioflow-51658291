/**
 * React Hooks for Statsig Feature Flags
 *
 * These hooks provide a React-friendly interface to Statsig
 * feature flags and dynamic configs.
 *
 * Usage:
 * ```tsx
 * import { useFeatureFlag, useDynamicConfig, useAnalytics } from '@/lib/featureFlags/hooks';
 *
 * function MyComponent() {
 *   const { enabled: newDashboard } = useFeatureFlag('new_dashboard');
 *   const { config: uiConfig } = useDynamicConfig('ui_configuration');
 *   const { logEvent } = useAnalytics();
 *
 *   if (!newDashboard) return <OldDashboard />;
 *   return <NewDashboard config={uiConfig} />;
 * }
 * ```
 */

import React, { useEffect, useState, useCallback, createContext } from 'react';
import * as Statsig from 'statsig-react';
import {
  StatsigService,
  FeatureFlagName,
  DynamicConfigName,
} from './statsig';

// ============================================================================
// CONTEXT
// ============================================================================

interface FeatureFlagContextValue {
  isInitialized: boolean;
  userId: string | null;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
  isInitialized: false,
  userId: null,
});

/**
 * Provider component for feature flags
 * Wraps your app to enable Statsig functionality
 */
export function FeatureFlagProvider({
  children,
  sdkKey,
  user,
}: {
  children: React.ReactNode;
  sdkKey?: string;
  user?: { userID?: string; email?: string;[key: string]: unknown };
}) {
  const [userId] = useState(user?.userID || null);

  // Get the SDK key from props or environment
  const rawKey = sdkKey || import.meta.env.VITE_STATSIG_CLIENT_KEY || import.meta.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;
  const statsigKey = rawKey?.trim();

  // Debug log to verify key (masked)
  useEffect(() => {
    if (statsigKey) {
      console.log('[Statsig] Initializing with key:', `${statsigKey.substring(0, 10)}...`);
    } else {
      console.warn('[Statsig] No key found');
    }
  }, [statsigKey]);

  // Check if we have a valid Statsig key (must start with "client-")
  const isValidKey = statsigKey && statsigKey.startsWith('client-') && statsigKey.length > 10;

  // If no valid key, just render children without StatsigProvider
  if (!isValidKey) {
    console.warn('Statsig: No valid client SDK key provided. Feature flags will use default values. Get your key at https://statsig.com/');
    return (
      <FeatureFlagContext.Provider value={{ isInitialized: false, userId }}>
        {children}
      </FeatureFlagContext.Provider>
    );
  }

  return (
    <FeatureFlagContext.Provider value={{ isInitialized: true, userId }}>
      <Statsig.StatsigProvider sdkKey={statsigKey} user={user || { userID: 'anonymous' }}>
        {children}
      </Statsig.StatsigProvider>
    </FeatureFlagContext.Provider>
  );
}

// ============================================================================
// FEATURE FLAG HOOKS
// ============================================================================

/**
 * Hook to check if a feature flag is enabled
 *
 * @param flagName - The name of the feature flag to check
 * @param options - Optional Statsig options
 * @returns Object with enabled status and metadata
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { enabled, isLoading, metadata } = useFeatureFlag('new_dashboard');
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!enabled) return <OldDashboard />;
 *   return <NewDashboard />;
 * }
 * ```
 */
export function useFeatureFlag(
  flagName: FeatureFlagName,
  _options?: Statsig.StatsigOptions
): {
  enabled: boolean;
  isLoading: boolean;
  metadata?: unknown;
  error: Error | null;
} {
  const [data, setData] = useState<{
    enabled: boolean;
    metadata?: unknown;
  }>(() => ({
    enabled: StatsigService.isFeatureEnabled(flagName),
  }));

  const [isLoading, setIsLoading] = useState(!StatsigService.isInitialized());

  useEffect(() => {
    if (!StatsigService.isInitialized()) {
      setIsLoading(false);
      return;
    }

    // Initial check - just get the value, no subscription needed
    // statsig-react v2 doesn't have subscribeToGateChanges
    const checkGate = () => {
      const metadata = StatsigService.getFeatureFlagMetadata(flagName);
      setData({
        enabled: metadata.enabled,
        metadata: metadata.metadata,
      });
      setIsLoading(false);
    };

    checkGate();
    // No subscription in statsig-react v2 - values are reactive via provider
  }, [flagName]);

  return {
    ...data,
    isLoading,
    error: null,
  };
}

/**
 * Hook to check multiple feature flags at once
 *
 * @param flagNames - Array of feature flag names to check
 * @returns Object with all flag values
 *
 * @example
 * ```tsx
 * function Settings() {
 *   const flags = useMultipleFeatureFlags([
 *     'whatsapp_notifications',
 *     'email_reminders',
 *     'ai_chatbot'
 *   ]);
 *
 *   return (
 *     <div>
 *       <Toggle checked={flags.whatsapp_notifications} />
 *       <Toggle checked={flags.email_reminders} />
 *       <Toggle checked={flags.ai_chatbot} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useMultipleFeatureFlags(
  flagNames: FeatureFlagName[]
): Record<FeatureFlagName, boolean> & { isLoading: boolean } {
  const [flags, setFlags] = useState<Record<FeatureFlagName, boolean>>(() =>
    StatsigService.getMultipleFeatureFlags(flagNames)
  );
  const [isLoading, setIsLoading] = useState(!StatsigService.isInitialized());

  useEffect(() => {
    if (!StatsigService.isInitialized()) {
      setIsLoading(false);
      return;
    }

    const checkFlags = () => {
      setFlags(StatsigService.getMultipleFeatureFlags(flagNames));
      setIsLoading(false);
    };

    checkFlags();
    // No subscription in statsig-react v2 - values are reactive via provider
  }, [flagNames]);

  return {
    ...flags,
    isLoading,
  };
}

// ============================================================================
// DYNAMIC CONFIG HOOKS
// ============================================================================

/**
 * Hook to get dynamic configuration
 *
 * @param configName - The name of the dynamic config
 * @returns Object with config value and loading state
 *
 * @example
 * ```tsx
 * function AppointmentForm() {
 *   const { config: settings } = useDynamicConfig('appointment_settings');
 *
 *   return (
 *     <form>
 *       <Duration defaultValue={settings?.defaultDuration} />
 *       <BufferTime defaultValue={settings?.bufferTime} />
 *     </form>
 *   );
 * }
 * ```
 */
export function useDynamicConfig<T = unknown>(
  configName: DynamicConfigName
): {
  config: T | null;
  isLoading: boolean;
  error: Error | null;
} {
  const [config, setConfig] = useState<T | null>(() =>
    StatsigService.getDynamicConfig<T>(configName)
  );
  const [isLoading, setIsLoading] = useState(!StatsigService.isInitialized());

  useEffect(() => {
    if (!StatsigService.isInitialized()) {
      setIsLoading(false);
      return;
    }

    const checkConfig = () => {
      setConfig(StatsigService.getDynamicConfig<T>(configName));
      setIsLoading(false);
    };

    checkConfig();
    // No subscription in statsig-react v2 - values are reactive via provider
  }, [configName]);

  return { config, isLoading, error: null };
}

/**
 * Hook to get a specific value from a dynamic config
 *
 * @param configName - The name of the dynamic config
 * @param key - The key to get from the config
 * @param defaultValue - Default value if key not found
 * @returns The config value or default
 *
 * @example
 * ```tsx
 * function AIChat() {
 *   const model = useConfigValue('ai_models_config', 'chat', 'gemini-2.0-flash-exp');
 *
 *   return <AIModelPicker selected={model} />;
 * }
 * ```
 */
export function useConfigValue<T = unknown>(
  configName: DynamicConfigName,
  key: string,
  defaultValue?: T
): T | undefined {
  const { config } = useDynamicConfig<Record<string, T>>(configName);

  return config?.[key] ?? defaultValue;
}

// ============================================================================
// EXPERIMENT HOOKS
// ============================================================================

/**
 * Hook to get experiment variant
 *
 * @param experimentName - The name of the experiment
 * @returns Object with variant value and loading state
 *
 * @example
 * ```tsx
 * function DashboardLayout() {
 *   const { variant, name } = useExperiment('dashboard_layout_ab_test');
 *
 *   if (name === 'A') return <ClassicLayout />;
 *   if (name === 'B') return <NewLayout />;
 *   return <DefaultLayout />;
 * }
 * ```
 */
export function useExperiment<T = string>(
  experimentName: string
): {
  variant: T | null;
  name: string;
  isLoading: boolean;
  logExposure: () => void;
} {
  const [data, setData] = useState<{ variant: T | null; name: string }>(() => {
    const result = StatsigService.getExperiment<T>(experimentName);
    return {
      variant: result?.value ?? null,
      name: result?.name ?? '',
    };
  });
  const [isLoading, setIsLoading] = useState(!StatsigService.isInitialized());

  useEffect(() => {
    if (!StatsigService.isInitialized()) {
      setIsLoading(false);
      return;
    }

    const checkExperiment = () => {
      const result = StatsigService.getExperiment<T>(experimentName);
      setData({
        variant: result?.value ?? null,
        name: result?.name ?? '',
      });
      setIsLoading(false);
    };

    checkExperiment();
    // No subscription in statsig-react v2 - values are reactive via provider
  }, [experimentName]);

  const logExposure = useCallback(() => {
    StatsigService.logExperimentExposure(experimentName);
  }, [experimentName]);

  return {
    ...data,
    isLoading,
    logExposure,
  };
}

// ============================================================================
// ANALYTICS HOOKS
// ============================================================================

/**
 * Hook for logging analytics events
 *
 * @returns Object with logEvent function
 *
 * @example
 * ```tsx
 * function AppointmentButton() {
 *   const { logEvent } = useAnalytics();
 *
 *   const handleClick = () => {
 *     logEvent('appointment_button_clicked', undefined, { location: 'dashboard' });
 *   };
 *
 *   return <button onClick={handleClick}>Book Appointment</button>;
 * }
 * ```
 */
export function useAnalytics(): {
  logEvent: (
    eventName: string,
    value?: number,
    metadata?: Record<string, string | number | boolean | null>
  ) => void;
  Analytics: typeof StatsigService.Analytics;
} {
  const logEvent = useCallback((
    eventName: string,
    value?: number,
    metadata?: Record<string, string | number | boolean | null>
  ) => {
    StatsigService.logEvent(eventName, value, metadata);
  }, []);

  return {
    logEvent,
    Analytics: StatsigService.Analytics,
  };
}

// ============================================================================
// SPECIALIZED HOOKS FOR FISIOFLOW
// ============================================================================

/**
 * Hook for AI-related feature flags
 */
export function useAIFeatures() {
  return useMultipleFeatureFlags([
    'ai_transcription',
    'ai_chatbot',
    'ai_exercise_suggestions',
    'ai_clinsight_insights',
  ]);
}

/**
 * Hook for clinical feature flags
 */
export function useClinicalFeatures() {
  return useMultipleFeatureFlags([
    'digital_prescription',
    'pain_map_v2',
    'soap_records_v2',
    'exercise_library_v2',
  ]);
}

/**
 * Hook for integration feature flags
 */
export function useIntegrationFeatures() {
  return useMultipleFeatureFlags([
    'whatsapp_notifications',
    'google_calendar_sync',
    'email_reminders',
  ]);
}

/**
 * Hook for system status
 */
export function useSystemStatus() {
  return useMultipleFeatureFlags([
    'maintenance_mode',
    'beta_features',
  ]);
}

// ============================================================================
// HOC FOR COMPONENT-GUARDING
// ============================================================================

/**
 * Higher-order component to conditionally render based on feature flag
 *
 * @example
 * ```tsx
 * const NewDashboard = withFeatureFlag('new_dashboard')(DashboardComponent);
 * ```
 */
export function withFeatureFlag<P extends object>(
  flagName: FeatureFlagName,
  fallback?: React.ComponentType<P>
) {
  return function (Component: React.ComponentType<P>) {
    return function FeatureFlagWrapper(props: P) {
      const { enabled, isLoading } = useFeatureFlag(flagName);

      if (isLoading) {
        return null; // or loading spinner
      }

      if (!enabled) {
        return fallback ? React.createElement(fallback, props) : null;
      }

      return React.createElement(Component, props);
    };
  };
}

/**
 * Component for conditional rendering based on feature flag
 *
 * @example
 * ```tsx
 * <FeatureFlag flag="new_dashboard">
 *   <NewDashboard />
 * </FeatureFlag>
 * <FeatureFlag flag="new_dashboard" invert>
 *   <OldDashboard />
 * </FeatureFlag>
 * ```
 */
export function FeatureFlag({
  flag,
  children,
  invert = false,
  fallback = null,
}: {
  flag: FeatureFlagName;
  children: React.ReactNode;
  invert?: boolean;
  fallback?: React.ReactNode;
}) {
  const { enabled, isLoading } = useFeatureFlag(flag);

  if (isLoading) return fallback;
  if (invert) return enabled ? fallback : children;
  return enabled ? children : fallback;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  FeatureFlagContext,
};

export type { FeatureFlagContextValue };
