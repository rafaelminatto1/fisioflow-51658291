/**
 * Feature Flags Module - Barrel Export
 *
 * Centralizes exports for all feature flag implementations:
 * - Statsig (recommended, unlimited free tier)
 * - Vercel Edge Config (fallback)
 * - Environment Variables (fallback)
 *
 * Usage:
 * ```tsx
 * import { useFeatureFlag, FeatureFlagProvider } from '@/lib/featureFlags';
 *
 * function App() {
 *   return (
 *     <FeatureFlagProvider user={{ userID: 'user-123' }}>
 *       <Dashboard />
 *     </FeatureFlagProvider>
 *   );
 * }
 *
 * function Dashboard() {
 *   const { enabled } = useFeatureFlag('new_dashboard');
 *   return enabled ? <NewDashboard /> : <OldDashboard />;
 * }
 * ```
 */

// Statsig integration (recommended)
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

// Statsig service
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

// Types
export type {
  FeatureFlagName,
  DynamicConfigName,
  FeatureFlagConfig,
  DynamicConfigValue,
  ExperimentConfig,
} from './statsig';

// Fallbacks (if Statsig is not configured)
export {
  getFeatureFlagsFromEnv as getFeatureFlagsFromEnvFallback,
  isFeatureEnabledFromEnv,
  showFeature as showFeatureFromEnv,
} from './envFlags';

// Edge Config (Vercel native, alternative to Statsig)
export {
  getFeatureFlags as getEdgeConfigFlags,
  isFeatureEnabled as isEdgeConfigEnabled,
  getMultipleFeatures as getMultipleEdgeConfigFeatures,
  getUserFeatures as getUserEdgeConfigFeatures,
  withFeatureFlag as withEdgeConfigFeatureFlag,
  isMaintenanceMode as isEdgeConfigMaintenanceMode,
  getABTestVariant,
} from './edgeConfig';
