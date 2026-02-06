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
import {

  StatsigService,
  FeatureFlagName,
  DynamicConfigName,
  StatsigOptions,
  StatsigUser
} from './statsig';
import { fisioLogger as logger } from '@/lib/errors/logger';

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
      logger.debug('[Statsig] Key present (Statsig removed in this build)', undefined, 'featureFlags');
    } else {
      logger.debug('[Statsig] No key found', undefined, 'featureFlags');
    }
  }, [statsigKey]);

  // Always render without StatsigProvider
  return (
    <FeatureFlagContext.Provider value={{ isInitialized: false, userId }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ============================================================================
// FEATURE FLAG HOOKS
// ============================================================================

/**
 * Hook to check if a feature flag is enabled
 */
export function useFeatureFlag(
  flagName: FeatureFlagName,
  _options?: StatsigOptions
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

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initial check - just get the value
    const checkGate = () => {
      const metadata = StatsigService.getFeatureFlagMetadata(flagName);
      setData({
        enabled: metadata.enabled,
        metadata: metadata.metadata,
      });
      setIsLoading(false);
    };

    checkGate();
  }, [flagName]);

  return {
    ...data,
    isLoading,
    error: null,
  };
}

/**
 * Hook to check multiple feature flags at once
 */
export function useMultipleFeatureFlags(
  flagNames: FeatureFlagName[]
): Record<FeatureFlagName, boolean> & { isLoading: boolean } {
  const [flags, setFlags] = useState<Record<FeatureFlagName, boolean>>(() =>
    StatsigService.getMultipleFeatureFlags(flagNames)
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkFlags = () => {
      setFlags(StatsigService.getMultipleFeatureFlags(flagNames));
      setIsLoading(false);
    };

    checkFlags();
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkConfig = () => {
      setConfig(StatsigService.getDynamicConfig<T>(configName));
      setIsLoading(false);
    };

    checkConfig();
  }, [configName]);

  return { config, isLoading, error: null };
}

/**
 * Hook to get a specific value from a dynamic config
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkExperiment = () => {
      const result = StatsigService.getExperiment<T>(experimentName);
      setData({
        variant: result?.value ?? null,
        name: result?.name ?? '',
      });
      setIsLoading(false);
    };

    checkExperiment();
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
