/**
 * Sistema de Analytics e Métricas - FisioFlow
 * Coleta e análise de dados de uso, performance e comportamento
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface UserMetrics {
  userId: string;
  sessionDuration: number;
  pageViews: number;
  interactions: number;
  features: string[];
  lastActivity: number;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

export interface BusinessMetrics {
  appointments: {
    created: number;
    completed: number;
    cancelled: number;
    rescheduled: number;
  };
  patients: {
    new: number;
    returning: number;
    active: number;
  };
  revenue: {
    total: number;
    byService: Record<string, number>;
  };
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private sessionStart: number;
  private pageViews: number = 0;
  private interactions: number = 0;
  private features: Set<string> = new Set();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = Date.now();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden');
      } else {
        this.track('page_visible');
      }
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.flushEvents();
    });

    // Track performance metrics
    this.trackPerformanceMetrics();

    // Track user interactions
    this.trackUserInteractions();
  }

  setUserId(userId: string): void {
    this.userId = userId;
    this.track('user_identified', { userId });
  }

  track(eventName: string, properties?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.events.push(event);
    this.interactions++;

    // Track feature usage
    if (properties?.feature) {
      this.features.add(properties.feature);
    }

    // Send to analytics providers
    this.sendToProviders(event);

    // Auto-flush events periodically
    if (this.events.length >= 10) {
      this.flushEvents();
    }
  }

  trackPageView(path: string, title?: string): void {
    this.pageViews++;
    this.track('page_view', {
      path,
      title: title || document.title,
      pageViews: this.pageViews
    });
  }

  trackUserAction(action: string, target?: string, value?: any): void {
    this.track('user_action', {
      action,
      target,
      value,
      feature: this.getCurrentFeature()
    });
  }

  trackError(error: Error, context?: Record<string, any>): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context,
      url: window.location.href
    });
  }

  trackBusinessEvent(event: string, data: Record<string, any>): void {
    this.track('business_event', {
      event,
      ...data,
      timestamp: Date.now()
    });
  }

  private trackPerformanceMetrics(): void {
    // Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.track('performance_metric', {
          metric: 'lcp',
          value: lastEntry.startTime,
          rating: this.getRating('lcp', lastEntry.startTime)
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.track('performance_metric', {
            metric: 'fid',
            value: entry.processingStart - entry.startTime,
            rating: this.getRating('fid', entry.processingStart - entry.startTime)
          });
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.track('performance_metric', {
          metric: 'cls',
          value: clsValue,
          rating: this.getRating('cls', clsValue)
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }

    // Navigation Timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.track('performance_metric', {
            metric: 'page_load_time',
            value: navigation.loadEventEnd - navigation.fetchStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            firstByte: navigation.responseStart - navigation.fetchStart
          });
        }
      }, 0);
    });
  }

  private trackUserInteractions(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const className = target.className;
      const id = target.id;
      const text = target.textContent?.slice(0, 50);

      this.track('click', {
        tagName,
        className,
        id,
        text,
        x: event.clientX,
        y: event.clientY
      });
    });

    // Form interactions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.track('form_submit', {
        formId: form.id,
        formClass: form.className,
        action: form.action
      });
    });

    // Scroll tracking
    let scrollDepth = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      
      if (currentScroll > scrollDepth && currentScroll % 25 === 0) {
        scrollDepth = currentScroll;
        this.track('scroll_depth', { depth: scrollDepth });
      }
    });
  }

  private getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (!threshold) return 'good';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private getCurrentFeature(): string {
    const path = window.location.pathname;
    if (path.includes('/appointments')) return 'appointments';
    if (path.includes('/patients')) return 'patients';
    if (path.includes('/treatments')) return 'treatments';
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  }

  private async sendToProviders(event: AnalyticsEvent): Promise<void> {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', event.name, event.properties);
    }

    // Custom analytics endpoint - only in production
    if (import.meta.env.PROD) {
      try {
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        });
      } catch (error) {
        console.warn('Failed to send analytics event:', error);
      }
    } else {
      // Development mode - just log to console
      console.log('📊 Analytics Event (dev):', event.name, event.properties);
    }
  }

  getUserMetrics(): UserMetrics {
    return {
      userId: this.userId || 'anonymous',
      sessionDuration: Date.now() - this.sessionStart,
      pageViews: this.pageViews,
      interactions: this.interactions,
      features: Array.from(this.features),
      lastActivity: Date.now()
    };
  }

  getSessionEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  flushEvents(): void {
    if (this.events.length === 0) return;

    // Send batch to analytics
    this.sendBatchToProviders([...this.events]);
    
    // Clear events
    this.events = [];
  }

  private async sendBatchToProviders(events: AnalyticsEvent[]): Promise<void> {
    // Only send to server in production
    if (import.meta.env.PROD) {
      try {
        await fetch('/api/analytics/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events, sessionId: this.sessionId })
        });
      } catch (error) {
        console.warn('Failed to send batch analytics:', error);
      }
    } else {
      // Development mode - just log to console
      console.log('📊 Analytics Batch (dev):', events.length, 'events', events);
    }
  }

  // Business metrics helpers
  trackAppointmentCreated(appointmentData: any): void {
    this.trackBusinessEvent('appointment_created', {
      patientId: appointmentData.patientId,
      serviceType: appointmentData.serviceType,
      date: appointmentData.date,
      value: appointmentData.value
    });
  }

  trackAppointmentCompleted(appointmentData: any): void {
    this.trackBusinessEvent('appointment_completed', {
      appointmentId: appointmentData.id,
      duration: appointmentData.duration,
      satisfaction: appointmentData.satisfaction
    });
  }

  trackPatientRegistered(patientData: any): void {
    this.trackBusinessEvent('patient_registered', {
      patientId: patientData.id,
      source: patientData.source,
      referral: patientData.referral
    });
  }

  trackFeatureUsage(feature: string, action: string, metadata?: any): void {
    this.features.add(feature);
    this.track('feature_usage', {
      feature,
      action,
      metadata,
      timestamp: Date.now()
    });
  }
}

// Singleton instance
export const analytics = new AnalyticsService();

// React hook for analytics
export function useAnalytics() {
  const trackEvent = (name: string, properties?: Record<string, any>) => {
    analytics.track(name, properties);
  };

  const trackPageView = (path: string, title?: string) => {
    analytics.trackPageView(path, title);
  };

  const trackUserAction = (action: string, target?: string, value?: any) => {
    analytics.trackUserAction(action, target, value);
  };

  const trackFeature = (feature: string, action: string, metadata?: any) => {
    analytics.trackFeatureUsage(feature, action, metadata);
  };

  const setUserId = (userId: string) => {
    analytics.setUserId(userId);
  };

  const getUserMetrics = () => {
    return analytics.getUserMetrics();
  };

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackFeature,
    setUserId,
    getUserMetrics
  };
}

// Analytics configuration
export const analyticsConfig = {
  // Google Analytics 4
  ga4: {
    measurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID || '',
    enabled: import.meta.env.PROD
  },
  
  // Custom analytics
  custom: {
    endpoint: '/api/analytics',
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    enabled: import.meta.env.PROD
  },
  
  // Privacy settings
  privacy: {
    anonymizeIp: true,
    respectDoNotTrack: true,
    cookieConsent: true
  }
};

// Initialize analytics on app start
export function initializeAnalytics(): void {
  // Check for Do Not Track
  if (navigator.doNotTrack === '1' && analyticsConfig.privacy.respectDoNotTrack) {
    console.log('Analytics disabled due to Do Not Track setting');
    return;
  }

  // Initialize Google Analytics 4
  if (analyticsConfig.ga4.enabled && analyticsConfig.ga4.measurementId) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsConfig.ga4.measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', analyticsConfig.ga4.measurementId, {
      anonymize_ip: analyticsConfig.privacy.anonymizeIp,
      send_page_view: false // We'll handle this manually
    });
  }

  // Set up periodic flush
  setInterval(() => {
    analytics.flushEvents();
  }, analyticsConfig.custom.flushInterval);

  console.log('Analytics initialized successfully');
}

// Export types
export type { AnalyticsEvent, UserMetrics, PerformanceMetrics, BusinessMetrics };