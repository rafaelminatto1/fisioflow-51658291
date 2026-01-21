/**
 * React Hooks for Feature Flags
 *
 * Convenient hooks for checking feature flags in React components.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  featureFlagsService,
  checkFeatureGate,
  getFeatureConfig,
  FeatureFlagContext,
  CheckGateResult,
} from '@/lib/features/FeatureFlagsService';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// USE FEATURE GATE HOOK
// ============================================================================

export interface UseFeatureGateOptions {
  context?: Partial<FeatureFlagContext>;
  enabled?: boolean;
}

export interface UseFeatureGateResult {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Check if a feature gate is enabled for the current user
 */
export function useFeatureGate(
  gateName: string,
  options: UseFeatureGateOptions = {}
): UseFeatureGateResult {
  const { enabled: featureEnabled = true, context: extraContext } = options;
  const { user, profile } = useAuth();

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkGate = useCallback(async () => {
    if (!featureEnabled) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context: FeatureFlagContext = {
        userId: user?.id,
        email: user?.email,
        role: profile?.role,
        ...extraContext,
      };

      const result = await featureFlagsService.checkGate(gateName, context);
      setEnabled(result.pass);

      // Log exposure for A/B testing
      if (result.pass) {
        await featureFlagsService.logExposure(gateName, context);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [gateName, featureEnabled, extraContext, user, profile]);

  useEffect(() => {
    checkGate();
  }, [checkGate]);

  return {
    enabled,
    loading,
    error,
    refetch: checkGate,
  };
}

// ============================================================================
// USE DYNAMIC CONFIG HOOK
// ============================================================================

export interface UseDynamicConfigResult<T> {
  value: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Get dynamic config value for a feature
 */
export function useDynamicConfig<T>(
  configName: string,
  defaultValue: T,
  options: UseFeatureGateOptions = {}
): UseDynamicConfigResult<T> {
  const { enabled = true, context: extraContext } = options;
  const { user, profile } = useAuth();

  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!enabled) {
      setValue(defaultValue);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context: FeatureFlagContext = {
        userId: user?.id,
        email: user?.email,
        role: profile?.role,
        ...extraContext,
      };

      const result = await featureFlagsService.getConfig(configName, defaultValue, context);
      setValue(result.value);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setValue(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [configName, defaultValue, enabled, extraContext, user, profile]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    value,
    loading,
    error,
    refetch: fetchConfig,
  };
}

// ============================================================================
// USE FEATURE FLAGS HOOK (Multiple Gates)
// ============================================================================

export interface FeatureGates {
  [gateName: string]: boolean;
}

export interface UseFeatureGatesResult {
  gates: FeatureGates;
  loading: boolean;
  anyEnabled: boolean;
  allEnabled: boolean;
}

/**
 * Check multiple feature gates at once
 */
export function useFeatureGates(
  gateNames: string[],
  options: UseFeatureGateOptions = {}
): UseFeatureGatesResult {
  const [gates, setGates] = useState<FeatureGates>({});
  const [loading, setLoading] = useState(true);

  const checkAllGates = useCallback(async () => {
    setLoading(true);

    const results: FeatureGates = {};
    const promises = gateNames.map(async (gateName) => {
      const enabled = await checkFeatureGate(gateName, options.context);
      results[gateName] = enabled;
    });

    await Promise.all(promises);
    setGates(results);
    setLoading(false);
  }, [gateNames, options]);

  useEffect(() => {
    checkAllGates();
  }, [checkAllGates]);

  const anyEnabled = Object.values(gates).some(Boolean);
  const allEnabled = Object.values(gates).every(Boolean);

  return {
    gates,
    loading,
    anyEnabled,
    allEnabled,
  };
}

// ============================================================================
// CONDITIONAL RENDERING COMPONENTS
// ============================================================================

import { ReactNode } from 'react';

export interface FeatureGateProps {
  gateName: string;
  children: ReactNode;
  fallback?: ReactNode;
  loadingComponent?: ReactNode;
  context?: Partial<FeatureFlagContext>;
}

/**
 * Render children only if feature gate is enabled
 */
export function FeatureGate({
  gateName,
  children,
  fallback = null,
  loadingComponent = null,
  context,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureGate(gateName, { context });

  if (loading) {
    return <>{loadingComponent}</>;
  }

  if (!enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Render children only if feature gate is disabled
 */
export function FeatureGateDisabled({
  gateName,
  children,
  fallback = null,
  loadingComponent = null,
  context,
}: FeatureGateProps) {
  const { enabled, loading } = useFeatureGate(gateName, { context });

  if (loading) {
    return <>{loadingComponent}</>;
  }

  if (enabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// A/B TESTING HOOK
// ============================================================================

export interface UseABTestOptions {
  testName: string;
  variants: Record<string, unknown>;
  context?: Partial<FeatureFlagContext>;
}

export interface UseABTestResult<T> {
  variant: string | null;
  config: T | null;
  loading: boolean;
}

/**
 * A/B testing hook - assigns user to a variant
 */
export function useABTest<T = unknown>(
  options: UseABTestOptions
): UseABTestResult<T> {
  const { testName, variants, context: extraContext } = options;
  const { user, profile } = useAuth();

  const [variant, setVariant] = useState<string | null>(null);
  const [config, setConfig] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const assignVariant = async () => {
      setLoading(true);

      try {
        const context: FeatureFlagContext = {
          userId: user?.id,
          email: user?.email,
          role: profile?.role,
          ...extraContext,
        };

        // Get variant from feature flags
        const result = await featureFlagsService.getConfig<{ variant: string }>(
          `${testName}_variant`,
          { variant: 'control' },
          context
        );

        const assignedVariant = result.value.variant;
        setVariant(assignedVariant);
        setConfig((variants[assignedVariant] ?? null) as T);
      } catch (err) {
        console.error('Failed to assign A/B test variant:', err);
        setVariant('control');
        setConfig((variants.control ?? null) as T);
      } finally {
        setLoading(false);
      }
    };

    assignVariant();
  }, [testName, variants, user, profile, extraContext]);

  return {
    variant,
    config,
    loading,
  };
}

// ============================================================================
// FEATURE FLAG PROVIDER (Optional)
// ============================================================================

import { createContext, useContext as useContextHook } from 'react';

interface FeatureFlagContextValue {
  checkGate: (gateName: string, context?: FeatureFlagContext) => Promise<boolean>;
  getConfig: <T>(configName: string, defaultValue: T) => Promise<T>;
  logExposure: (gateName: string) => Promise<void>;
}

const FeatureFlagCtx = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({
  children,
  options,
}: {
  children: ReactNode;
  options?: Parameters<typeof featureFlagsService.initialize>[0];
}) {
  useEffect(() => {
    featureFlagsService.initialize(options);
  }, []);

  const value: FeatureFlagContextValue = {
    checkGate: async (gateName, context) => {
      const result = await featureFlagsService.checkGate(gateName, context);
      await featureFlagsService.logExposure(gateName, context);
      return result.pass;
    },
    getConfig: (configName, defaultValue) => {
      return featureFlagsService.getConfig(configName, defaultValue);
    },
    logExposure: (gateName) => {
      return featureFlagsService.logExposure(gateName);
    },
  };

  return (
    <FeatureFlagCtx.Provider value={value}>
      {children}
    </FeatureFlagCtx.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContextHook(FeatureFlagCtx);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
}

// ============================================================================
// PRE-CONFIGURED GATES
// ============================================================================

// Convenience hooks for common gates
export function usePatientMagicLink() {
  return useFeatureGate('patient-magic-link');
}

export function usePatientDashboardV2() {
  return useFeatureGate('patient-dashboard-v2');
}

export function useExerciseVoiceInstructions() {
  return useFeatureGate('exercise-voice-instructions');
}

export function useGrokClinicalAnalysis() {
  return useFeatureGate('grok-clinical-analysis');
}

export function useAISOAPAssistance() {
  return useFeatureGate('ai-soap-assistance');
}

export function useAdvancedAnalytics() {
  return useFeatureGate('advanced-analytics');
}

export function useRealtimeCollaboration() {
  return useFeatureGate('realtime-collaboration');
}

export function useTelemedicineV2() {
  return useFeatureGate('telemedicine-v2');
}

export function useBetaGamification() {
  return useFeatureGate('beta-gamification');
}
