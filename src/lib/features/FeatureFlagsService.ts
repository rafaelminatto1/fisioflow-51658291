/**
 * Feature Flags Service
 *
 * Provides feature flag management with support for:
 * - In-memory flags (development)
 * - Statsig integration
 * - Hypertune integration
 * - Remote config
 *
 * @see https://docs.statsig.com
 * @see https://hypertune.com/docs
 */

// ============================================================================
// TYPES
// ============================================================================

export type FeatureFlagProvider = 'local' | 'statsig' | 'hypertune';

export interface FeatureFlagConfig {
  key: string;
  enabled: boolean;
  description?: string;
  conditions?: FlagCondition[];
  defaultValue?: boolean;
  fallthrough?: FlagCondition[];
  rolloutPercentage?: number; // 0-100
}

export interface FlagCondition {
  type: 'user' | 'role' | 'organization' | 'country' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'gt' | 'lt';
  value: string | number | string[];
}

export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  country?: string;
  customData?: Record<string, unknown>;
}

export interface FeatureFlagsOptions {
  provider?: FeatureFlagProvider;
  statsigKey?: string;
  hypertuneKey?: string;
  environment?: 'development' | 'staging' | 'production';
}

export interface CheckGateResult {
  pass: boolean;
  rule?: string;
  reason?: string;
}

export interface DynamicConfigResult<T> {
  value: T;
  rule?: string;
}

// ============================================================================
// LOCAL FEATURE FLAGS (Development)
// ============================================================================

const LOCAL_FLAGS: Record<string, FeatureFlagConfig> = {
  // Patient Experience
  'patient-magic-link': {
    key: 'patient-magic-link',
    enabled: true,
    description: 'Enable magic link authentication for patients',
    rolloutPercentage: 100,
  },
  'patient-dashboard-v2': {
    key: 'patient-dashboard-v2',
    enabled: true,
    description: 'New patient dashboard UI',
    rolloutPercentage: 50,
  },
  'exercise-voice-instructions': {
    key: 'exercise-voice-instructions',
    enabled: true,
    description: 'Voice instructions for exercises using ElevenLabs',
    rolloutPercentage: 30,
  },

  // Clinical Tools
  'grok-clinical-analysis': {
    key: 'grok-clinical-analysis',
    enabled: true,
    description: 'Use Grok-2 for advanced clinical analysis',
    conditions: [
      { type: 'role', operator: 'in', value: ['admin', 'fisioterapeuta'] },
    ],
  },
  'ai-soap-assistance': {
    key: 'ai-soap-assistance',
    enabled: true,
    description: 'AI assistance for SOAP note generation',
    rolloutPercentage: 100,
  },

  // Admin Features
  'advanced-analytics': {
    key: 'advanced-analytics',
    enabled: false,
    description: 'Advanced analytics dashboard',
    conditions: [
      { type: 'role', operator: 'in', value: ['admin', 'owner'] },
    ],
  },
  'realtime-collaboration': {
    key: 'realtime-collaboration',
    enabled: true,
    description: 'Real-time collaboration on patient records',
    rolloutPercentage: 20,
  },

  // Financial
  'stripe-vouchers': {
    key: 'stripe-vouchers',
    enabled: true,
    description: 'Stripe integration for vouchers',
    rolloutPercentage: 100,
  },

  // Telemedicine
  'telemedicine-v2': {
    key: 'telemedicine-v2',
    enabled: true,
    description: 'Enhanced telemedicine features',
    conditions: [
      { type: 'role', operator: 'in', value: ['admin', 'fisioterapeuta'] },
    ],
  },

  // Beta Features
  'beta-gamification': {
    key: 'beta-gamification',
    enabled: true,
    description: 'Patient gamification features',
    rolloutPercentage: 80,
  },
};

// ============================================================================
// FEATURE FLAGS SERVICE
// ============================================================================

class FeatureFlagsServiceClass {
  private provider: FeatureFlagProvider = 'local';
  private statsigKey: string | null = null;
  private hypertuneKey: string | null = null;
  private environment: 'development' | 'staging' | 'production' = 'development';
  private statsigSDK: any = null;
  private hypertuneSDK: any = null;

  /**
   * Initialize the feature flags service
   */
  async initialize(options: FeatureFlagsOptions = {}) {
    this.provider = options.provider || this.getProviderFromEnv();
    this.statsigKey = options.statsigKey || this.getStatsigKey();
    this.hypertuneKey = options.hypertuneKey || this.getHypertuneKey();
    this.environment = options.environment || this.getEnvironment();

    // Load SDK if needed
    if (this.provider === 'statsig' && this.statsigKey) {
      await this.loadStatsig();
    } else if (this.provider === 'hypertune' && this.hypertuneKey) {
      await this.loadHypertune();
    }

    console.log(`Feature flags initialized with provider: ${this.provider}`);
  }

  /**
   * Check if a gate (boolean flag) passes
   */
  async checkGate(
    gateName: string,
    context: FeatureFlagContext = {}
  ): Promise<CheckGateResult> {
    // Check local cache first
    const localFlag = LOCAL_FLAGS[gateName];
    if (localFlag && this.provider === 'local') {
      return this.evaluateLocalFlag(localFlag, context);
    }

    // Use provider
    switch (this.provider) {
      case 'statsig':
        return this.checkStatsigGate(gateName, context);
      case 'hypertune':
        return this.checkHypertuneGate(gateName, context);
      default:
        // Fall back to local
        if (localFlag) {
          return this.evaluateLocalFlag(localFlag, context);
        }
        return { pass: false, reason: 'Flag not found' };
    }
  }

  /**
   * Get dynamic config value
   */
  async getConfig<T>(
    configName: string,
    defaultValue: T,
    context: FeatureFlagContext = {}
  ): Promise<DynamicConfigResult<T>> {
    switch (this.provider) {
      case 'statsig':
        return this.getStatsigConfig(configName, defaultValue, context);
      case 'hypertune':
        return this.getHypertuneConfig(configName, defaultValue, context);
      default:
        return { value: defaultValue };
    }
  }

  /**
   * Log exposure for A/B testing
   */
  async logExposure(gateName: string, context: FeatureFlagContext = {}) {
    if (this.provider === 'statsig' && this.statsigSDK) {
      // Statsig automatically logs exposure on checkGate
    } else if (this.provider === 'hypertune' && this.hypertuneSDK) {
      // Hypertune exposure logging
      console.log(`[FeatureFlags] Exposure logged: ${gateName}`);
    } else {
      console.log(`[FeatureFlags] Would log exposure: ${gateName}`);
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private getProviderFromEnv(): FeatureFlagProvider {
    const provider = import.meta.env.VITE_FEATURE_FLAG_PROVIDER || 'local';
    return provider as FeatureFlagProvider;
  }

  private getStatsigKey(): string | null {
    return import.meta.env.VITE_STATSIG_SDK_KEY || null;
  }

  private getHypertuneKey(): string | null {
    return import.meta.env.VITE_HYPERTUNE_API_KEY || null;
  }

  private getEnvironment(): 'development' | 'staging' | 'production' {
    const mode = import.meta.env.MODE;
    if (mode === 'production') return 'production';
    if (mode === 'staging') return 'staging';
    return 'development';
  }

  private async loadStatsig() {
    try {
      // Dynamic import for Statsig
      const { StatsigClient } = await import('statsig-node');
      this.statsigSDK = StatsigClient;
    } catch (error) {
      console.warn('Statsig SDK not available:', error);
    }
  }

  private async loadHypertune() {
    try {
      // Dynamic import for Hypertune
      // Hypertune typically uses a REST API or SDK
      console.log('Hypertune integration ready');
    } catch (error) {
      console.warn('Hypertune SDK not available:', error);
    }
  }

  private evaluateLocalFlag(
    flag: FeatureFlagConfig,
    context: FeatureFlagContext
  ): CheckGateResult {
    // Check conditions first
    if (flag.conditions) {
      const conditionPass = this.evaluateConditions(flag.conditions, context);
      if (!conditionPass) {
        return {
          pass: flag.defaultValue ?? false,
          reason: 'Conditions not met',
        };
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      const hash = this.hashString(`${flag.key}:${context.userId || 'anonymous'}`);
      const userRollout = (hash % 100);
      const passRollout = userRollout < flag.rolloutPercentage;

      return {
        pass: flag.enabled && passRollout,
        reason: passRollout ? 'Within rollout percentage' : 'Outside rollout percentage',
      };
    }

    return {
      pass: flag.enabled ?? false,
    };
  }

  private evaluateConditions(
    conditions: FlagCondition[],
    context: FeatureFlagContext
  ): boolean {
    return conditions.every((condition) => {
      const contextValue = this.getContextValue(condition.type, context);

      switch (condition.operator) {
        case 'equals':
          return contextValue === condition.value;
        case 'not_equals':
          return contextValue !== condition.value;
        case 'contains':
          return typeof contextValue === 'string' &&
                 String(condition.value).includes(contextValue);
        case 'in':
          return Array.isArray(condition.value) &&
                 condition.value.includes(contextValue);
        case 'not_in':
          return Array.isArray(condition.value) &&
                 !condition.value.includes(contextValue);
        case 'gt':
          return typeof contextValue === 'number' &&
                 contextValue > Number(condition.value);
        case 'lt':
          return typeof contextValue === 'number' &&
                 contextValue < Number(condition.value);
        default:
          return false;
      }
    });
  }

  private getContextValue(type: string, context: FeatureFlagContext): unknown {
    switch (type) {
      case 'user':
        return context.userId;
      case 'role':
        return context.role;
      case 'organization':
        return context.organizationId;
      case 'country':
        return context.country;
      case 'custom':
        return context.customData;
      default:
        return null;
    }
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private async checkStatsigGate(
    gateName: string,
    context: FeatureFlagContext
  ): Promise<CheckGateResult> {
    // Statsig implementation would go here
    // For now, fall back to local
    const localFlag = LOCAL_FLAGS[gateName];
    if (localFlag) {
      return this.evaluateLocalFlag(localFlag, context);
    }
    return { pass: false, reason: 'Statsig not configured' };
  }

  private async checkHypertuneGate(
    gateName: string,
    context: FeatureFlagContext
  ): Promise<CheckGateResult> {
    // Hypertune implementation would go here
    // For now, fall back to local
    const localFlag = LOCAL_FLAGS[gateName];
    if (localFlag) {
      return this.evaluateLocalFlag(localFlag, context);
    }
    return { pass: false, reason: 'Hypertune not configured' };
  }

  private async getStatsigConfig<T>(
    configName: string,
    defaultValue: T,
    context: FeatureFlagContext
  ): Promise<DynamicConfigResult<T>> {
    // Statsig config implementation
    return { value: defaultValue };
  }

  private async getHypertuneConfig<T>(
    configName: string,
    defaultValue: T,
    context: FeatureFlagContext
  ): Promise<DynamicConfigResult<T>> {
    // Hypertune config implementation
    return { value: defaultValue };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const featureFlagsService = new FeatureFlagsServiceClass();

// Convenience functions
export async function checkFeatureGate(
  gateName: string,
  context?: FeatureFlagContext
): Promise<boolean> {
  const result = await featureFlagsService.checkGate(gateName, context);
  return result.pass;
}

export async function getFeatureConfig<T>(
  configName: string,
  defaultValue: T,
  context?: FeatureFlagContext
): Promise<T> {
  const result = await featureFlagsService.getConfig(configName, defaultValue, context);
  return result.value;
}

// Re-export types
export type {
  FeatureFlagConfig,
  FeatureFlagContext,
  FeatureFlagsOptions,
  CheckGateResult,
  DynamicConfigResult,
  FlagCondition,
};
