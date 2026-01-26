/**
 * Feature Flags Module - Barrel Export (Updated for Firebase)
 *
 * Centralizes exports for all feature flag implementations:
 * - Firebase Remote Config (primary, recommended)
 * - Statsig (fallback, unlimited free tier)
 * - Vercel Edge Config (legacy fallback)
 * - Environment Variables (ultimate fallback)
 *
 * Migration Path:
 * 1. Firebase Remote Config (NEW - Primary)
 * 2. Statsig (Optional - secondary)
 * 3. Edge Config (Legacy - will be removed)
 * 4. Env Variables (Fallback)
 *
 * Usage:
 * ```tsx
 * import { useRemoteConfig, isFeatureEnabled } from '@/lib/featureFlags';
 *
 * function App() {
 *   const { isFeatureEnabled } = useRemoteConfig();
 *   return isFeatureEnabled('new_dashboard') ? <New /> : <Old />;
 * }
 *
 * // Or with async function
 * const enabled = await isFeatureEnabled('new_dashboard');
 * ```
 */

// ============================================================================
// PRIMARY: Firebase Remote Config
// ============================================================================

export {
  initializeRemoteConfig,
  getRemoteConfigManager,
  useRemoteConfig,
  getFeatureFlags,
  isFeatureEnabled,
  getMultipleFeatures,
  getUserFeatures,
  isMaintenanceMode,
  getABTestVariant,
  refreshRemoteConfig,
  RemoteConfigService,
  type FeatureFlagName,
  type FeatureFlagConfig,
  REMOTE_CONFIG_KEYS,
  REMOTE_CONFIG_DEFAULTS,
} from '@/lib/firebase/remote-config';

// ============================================================================
// STATSIG (Optional - Secondary)
// ============================================================================

export {
  FeatureFlagProvider,
  useFeatureFlag,
  useMultipleFeatureFlags,
  useDynamicConfig,
  useConfigValue,
  useExperiment,
  useAnalytics,
  useAIFeatures,
  useClinicalFeatures,
  useIntegrationFeatures,
  useSystemStatus,
  withFeatureFlag,
  FeatureFlag,
} from './hooks';

export {
  StatsigService,
  isFeatureEnabled as isStatsigFeatureEnabled,
  getFeatureFlagMetadata,
  getMultipleFeatureFlags,
  getDynamicConfig,
  getConfigValue,
  getExperiment,
  logExperimentExposure,
  logEvent,
  updateUser,
  logUserOut,
  createFeatureFlagHook,
  createDynamicConfigHook,
} from './statsig';

export type {
  FeatureFlagName as StatsigFeatureFlagName,
  DynamicConfigName,
  FeatureFlagConfig as StatsigFeatureFlagConfig,
  DynamicConfigValue,
  ExperimentConfig,
} from './statsig';

// ============================================================================
// FALLBACKS: Edge Config & Env Variables (Legacy)
// ============================================================================

export {
  getFeatureFlagsFromEnv as getFeatureFlagsFromEnvFallback,
  isFeatureEnabledFromEnv,
  showFeature as showFeatureFromEnv,
} from './envFlags';

// Edge Config (Vercel - LEGACY, will be removed after migration)
// @deprecated Use Firebase Remote Config instead
export {
  getFeatureFlags as getEdgeConfigFlags,
  isFeatureEnabled as isEdgeConfigEnabled,
  getMultipleFeatures as getMultipleEdgeConfigFeatures,
  getUserFeatures as getUserEdgeConfigFeatures,
  withFeatureFlag as withEdgeConfigFeatureFlag,
  isMaintenanceMode as isEdgeConfigMaintenanceMode,
  getABTestVariant as getEdgeConfigABTestVariant,
} from './edgeConfig';
