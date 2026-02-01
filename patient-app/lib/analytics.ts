/**
 * Analytics Utilities
 * Event tracking and analytics helpers
 */

import { log } from './logger';
import { getDeviceInfo } from './device';

/**
 * Event names for analytics
 */
export const AnalyticsEvents = {
  // Auth events
  SIGN_UP_STARTED: 'sign_up_started',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  SIGN_UP_FAILED: 'sign_up_failed',
  LOGIN_STARTED: 'login_started',
  LOGIN_COMPLETED: 'login_completed',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_RESET: 'password_reset',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Professional link
  LINK_PROFESSIONAL_STARTED: 'link_professional_started',
  LINK_PROFESSIONAL_COMPLETED: 'link_professional_completed',
  LINK_PROFESSIONAL_FAILED: 'link_professional_failed',

  // Exercises
  EXERCISES_VIEWED: 'exercises_viewed',
  EXERCISE_COMPLETED: 'exercise_completed',
  EXERCISE_UNCOMPLETED: 'exercise_uncompleted',
  EXERCISE_VIDEO_PLAYED: 'exercise_video_played',
  EXERCISE_FEEDBACK_SUBMITTED: 'exercise_feedback_submitted',
  ALL_EXERCISES_COMPLETED: 'all_exercises_completed',

  // Appointments
  APPOINTMENTS_VIEWED: 'appointments_viewed',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',

  // Progress
  PROGRESS_VIEWED: 'progress_viewed',
  EVOLUTION_VIEWED: 'evolution_viewed',
  PROGRESS_PERIOD_CHANGED: 'progress_period_changed',

  // Profile & Settings
  PROFILE_VIEWED: 'profile_viewed',
  SETTINGS_VIEWED: 'settings_viewed',
  SETTINGS_CHANGED: 'settings_changed',
  NOTIFICATIONS_TOGGLED: 'notifications_toggled',

  // Settings specific
  AUTO_PLAY_TOGGLED: 'auto_play_toggled',
  HAPTIC_FEEDBACK_TOGGLED: 'haptic_feedback_toggled',
  CACHE_CLEARED: 'cache_cleared',
  DATA_EXPORTED: 'data_exported',

  // Support
  HELP_VIEWED: 'help_viewed',
  PRIVACY_VIEWED: 'privacy_viewed',
  TERMS_VIEWED: 'terms_viewed',
  SUPPORT_CONTACTED: 'support_contacted',
} as const;

/**
 * Event properties interfaces
 */
export interface EventProperties {
  // Common properties
  screen?: string;
  userId?: string;
  timestamp?: number;

  // Exercise properties
  exerciseId?: string;
  exerciseName?: string;
  exercisePlanId?: string;
  difficulty?: number;
  painLevel?: number;

  // Appointment properties
  appointmentId?: string;
  appointmentType?: string;
  appointmentStatus?: string;

  // Error properties
  errorCode?: string;
  errorMessage?: string;

  // Onboarding properties
  stepNumber?: number;
  totalSteps?: number;

  // Settings properties
  settingName?: string;
  settingValue?: any;

  [key: string]: any;
}

/**
 * Analytics client interface
 */
interface AnalyticsClient {
  track(eventName: string, properties?: EventProperties): void;
  identify(userId: string, traits?: Record<string, any>): void;
  reset(): void;
  screen(screenName: string, properties?: EventProperties): void;
}

/**
 * Mock analytics client for development
 */
class MockAnalyticsClient implements AnalyticsClient {
  track(eventName: string, properties?: EventProperties) {
    log.info('ANALYTICS', `Track: ${eventName}`, properties);
  }

  identify(userId: string, traits?: Record<string, any>) {
    log.info('ANALYTICS', `Identify: ${userId}`, traits);
  }

  reset() {
    log.info('ANALYTICS', 'Reset');
  }

  screen(screenName: string, properties?: EventProperties) {
    log.info('ANALYTICS', `Screen: ${screenName}`, properties);
  }
}

/**
 * Analytics manager
 */
class AnalyticsManager {
  private client: AnalyticsClient;
  private userId?: string;
  private deviceInfo: any;

  constructor(client?: AnalyticsClient) {
    this.client = client || new MockAnalyticsClient();
    this.deviceInfo = null;
  }

  /**
   * Initialize analytics with device info
   */
  async initialize() {
    try {
      this.deviceInfo = await getDeviceInfo();
      log.info('ANALYTICS', 'Analytics initialized');
    } catch (error) {
      log.error('ANALYTICS', 'Failed to initialize', error);
    }
  }

  /**
   * Set the current user
   */
  identify(userId: string, traits?: Record<string, any>) {
    this.userId = userId;
    this.client.identify(userId, {
      ...traits,
      ...this.getDeviceInfo(),
    });
  }

  /**
   * Reset the current user (logout)
   */
  reset() {
    this.userId = undefined;
    this.client.reset();
  }

  /**
   * Track an event
   */
  track(eventName: string, properties?: EventProperties) {
    const enrichedProperties = {
      ...properties,
      userId: this.userId,
      timestamp: Date.now(),
      ...this.getDeviceInfo(),
    };

    this.client.track(eventName, enrichedProperties);
  }

  /**
   * Track a screen view
   */
  screen(screenName: string, properties?: EventProperties) {
    const enrichedProperties = {
      ...properties,
      userId: this.userId,
      timestamp: Date.now(),
      ...this.getDeviceInfo(),
    };

    this.client.screen(screenName, enrichedProperties);
  }

  /**
   * Get device info for enrichment
   */
  private getDeviceInfo() {
    if (!this.deviceInfo) {
      return {};
    }

    return {
      platform: this.deviceInfo.platform,
      osVersion: this.deviceInfo.osVersion,
      modelName: this.deviceInfo.modelName,
      isTablet: this.deviceInfo.isTablet,
      appVersion: this.deviceInfo.appVersion,
    };
  }
}

// Singleton instance
export const analytics = new AnalyticsManager();

/**
 * Convenience functions for common analytics events
 */
export const track = {
  // Auth
  signUpStarted: () => analytics.track(AnalyticsEvents.SIGN_UP_STARTED),
  signUpCompleted: (userId: string) => {
    analytics.identify(userId);
    analytics.track(AnalyticsEvents.SIGN_UP_COMPLETED);
  },
  signUpFailed: (error: string) =>
    analytics.track(AnalyticsEvents.SIGN_UP_FAILED, { errorMessage: error }),
  loginStarted: () => analytics.track(AnalyticsEvents.LOGIN_STARTED),
  loginCompleted: (userId: string) => {
    analytics.identify(userId);
    analytics.track(AnalyticsEvents.LOGIN_COMPLETED);
  },
  loginFailed: (error: string) =>
    analytics.track(AnalyticsEvents.LOGIN_FAILED, { errorMessage: error }),
  logout: () => {
    analytics.track(AnalyticsEvents.LOGOUT);
    analytics.reset();
  },

  // Onboarding
  onboardingStarted: () => analytics.track(AnalyticsEvents.ONBOARDING_STARTED),
  onboardingStepViewed: (stepNumber: number, totalSteps: number) =>
    analytics.track(AnalyticsEvents.ONBOARDING_STEP_VIEWED, { stepNumber, totalSteps }),
  onboardingCompleted: () => analytics.track(AnalyticsEvents.ONBOARDING_COMPLETED),
  onboardingSkipped: () => analytics.track(AnalyticsEvents.ONBOARDING_SKIPPED),

  // Professional link
  linkProfessionalCompleted: () =>
    analytics.track(AnalyticsEvents.LINK_PROFESSIONAL_COMPLETED),

  // Exercises
  exercisesViewed: () => analytics.track(AnalyticsEvents.EXERCISES_VIEWED),
  exerciseCompleted: (exerciseId: string, exerciseName: string) =>
    analytics.track(AnalyticsEvents.EXERCISE_COMPLETED, { exerciseId, exerciseName }),
  exerciseVideoPlayed: (exerciseId: string, exerciseName: string) =>
    analytics.track(AnalyticsEvents.EXERCISE_VIDEO_PLAYED, { exerciseId, exerciseName }),
  exerciseFeedbackSubmitted: (exerciseId: string, difficulty: number, painLevel: number) =>
    analytics.track(AnalyticsEvents.EXERCISE_FEEDBACK_SUBMITTED, {
      exerciseId,
      difficulty,
      painLevel,
    }),
  allExercisesCompleted: () => analytics.track(AnalyticsEvents.ALL_EXERCISES_COMPLETED),

  // Appointments
  appointmentsViewed: () => analytics.track(AnalyticsEvents.APPOINTMENTS_VIEWED),

  // Progress
  progressViewed: () => analytics.track(AnalyticsEvents.PROGRESS_VIEWED),

  // Settings
  settingsViewed: () => analytics.track(AnalyticsEvents.SETTINGS_VIEWED),
  notificationsToggled: (enabled: boolean) =>
    analytics.track(AnalyticsEvents.NOTIFICATIONS_TOGGLED, { settingValue: enabled }),

  // Screens
  screenView: (screenName: string) => analytics.screen(screenName),
};

export default analytics;
