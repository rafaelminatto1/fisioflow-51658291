/**
 * Feature Flags Module - Barrel Export
 *
 * Centralizes exports for all feature flag implementations:
 * - Remote Config Manager (primary, recommended)
 * - Statsig (fallback, unlimited free tier)
 * - Vercel Edge Config (legacy fallback)
 * - Environment Variables (ultimate fallback)
 *
 * Migration Path:
 * 1. Remote Config Manager (NEW - Primary)
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
// PRIMARY: Remote Config Manager
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
} from "@/lib/remote-config-manager";

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
} from "./hooks";

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
} from "./statsig";

export type {
	FeatureFlagName as StatsigFeatureFlagName,
	DynamicConfigName,
	FeatureFlagConfig as StatsigFeatureFlagConfig,
	DynamicConfigValue,
	ExperimentConfig,
} from "./statsig";

// ============================================================================
// FALLBACKS: Edge Config & Env Variables (Legacy)
// ============================================================================

export {
	getFeatureFlagsFromEnv as getFeatureFlagsFromEnvFallback,
	isFeatureEnabledFromEnv,
	showFeature as showFeatureFromEnv,
} from "./envFlags";
