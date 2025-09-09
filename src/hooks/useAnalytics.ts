/**
 * Hook personalizado para Analytics - FisioFlow
 * Integração simplificada do sistema de analytics com componentes React
 */

import { useEffect, useCallback, useRef } from 'react';
import { analytics } from '@/utils/analytics';
import type { AnalyticsEvent, UserMetrics, PerformanceMetrics } from '@/utils/analytics';

// Hook principal para analytics
export const useAnalytics = () => {
  const pageStartTime = useRef<number>(Date.now());
  const interactionCount = useRef<number>(0);

  // Track page view
  const trackPageView = useCallback((pageName: string, additionalData?: Record<string, any>) => {
    analytics.track('page_view', {
      page: pageName,
      timestamp: Date.now(),
      referrer: document.referrer,
      ...additionalData
    });
  }, []);

  // Track user interaction
  const trackInteraction = useCallback((action: string, element: string, additionalData?: Record<string, any>) => {
    interactionCount.current += 1;
    
    analytics.track('user_interaction', {
      action,
      element,
      interactionCount: interactionCount.current,
      timestamp: Date.now(),
      ...additionalData
    });
  }, []);

  // Track business event
  const trackBusiness = useCallback((event: string, data?: Record<string, any>) => {
    analytics.trackBusiness(event, data);
  }, []);

  // Track performance metric
  const trackPerformance = useCallback((metric: string, value: number, additionalData?: Record<string, any>) => {
    analytics.trackPerformance({
      metric,
      value,
      timestamp: Date.now(),
      ...additionalData
    });
  }, []);

  // Track error
  const trackError = useCallback((error: Error, context?: string) => {
    analytics.track('error', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      url: window.location.href
    });
  }, []);

  // Track form submission
  const trackFormSubmission = useCallback((formName: string, success: boolean, data?: Record<string, any>) => {
    analytics.track('form_submission', {
      formName,
      success,
      timestamp: Date.now(),
      ...data
    });
  }, []);

  // Track search
  const trackSearch = useCallback((query: string, results: number, filters?: Record<string, any>) => {
    analytics.track('search', {
      query,
      results,
      filters,
      timestamp: Date.now()
    });
  }, []);

  return {
    trackPageView,
    trackInteraction,
    trackBusiness,
    trackPerformance,
    trackError,
    trackFormSubmission,
    trackSearch
  };
};

// Hook para tracking automático de página
export const usePageTracking = (pageName: string, additionalData?: Record<string, any>) => {
  const { trackPageView, trackPerformance } = useAnalytics();
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    // Verificar se analytics está habilitado
    const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true' && import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
    if (!analyticsEnabled) {
      console.debug('[Analytics] Page tracking disabled in development');
      return;
    }
    
    // Track page view on mount
    trackPageView(pageName, additionalData);

    // Track page load time
    const loadTime = Date.now() - startTime.current;
    trackPerformance('page_load_time', loadTime, { page: pageName });

    // Track time on page on unmount
    return () => {
      const timeOnPage = Date.now() - startTime.current;
      trackPerformance('time_on_page', timeOnPage, { page: pageName });
    };
  }, [pageName, trackPageView, trackPerformance, additionalData]);
};

// Hook para tracking de formulários
export const useFormTracking = (formName: string) => {
  const { trackFormSubmission, trackInteraction } = useAnalytics();
  const startTime = useRef<number>(Date.now());
  const fieldInteractions = useRef<Record<string, number>>({});

  const trackFieldInteraction = useCallback((fieldName: string) => {
    fieldInteractions.current[fieldName] = (fieldInteractions.current[fieldName] || 0) + 1;
    trackInteraction('field_focus', fieldName, { formName });
  }, [formName, trackInteraction]);

  const trackSubmission = useCallback((success: boolean, data?: Record<string, any>) => {
    const completionTime = Date.now() - startTime.current;
    
    trackFormSubmission(formName, success, {
      completionTime,
      fieldInteractions: fieldInteractions.current,
      ...data
    });
  }, [formName, trackFormSubmission]);

  return {
    trackFieldInteraction,
    trackSubmission
  };
};

// Hook para tracking de performance de componentes
export const useComponentPerformance = (componentName: string) => {
  const { trackPerformance } = useAnalytics();
  const renderCount = useRef<number>(0);
  const mountTime = useRef<number>(Date.now());

  useEffect(() => {
    // Verificar se analytics está habilitado
    const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true' && import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
    if (!analyticsEnabled) {
      console.debug('[Analytics] Component performance tracking disabled in development');
      return;
    }
    
    renderCount.current += 1;
    
    // Track component mount time
    if (renderCount.current === 1) {
      const mountDuration = Date.now() - mountTime.current;
      trackPerformance('component_mount_time', mountDuration, { component: componentName });
    }

    // Track render count
    trackPerformance('component_render_count', renderCount.current, { component: componentName });
  });

  const trackCustomMetric = useCallback((metric: string, value: number) => {
    trackPerformance(metric, value, { component: componentName });
  }, [componentName, trackPerformance]);

  return {
    trackCustomMetric,
    renderCount: renderCount.current
  };
};

// Hook para tracking de erros de componente
export const useErrorTracking = (componentName: string) => {
  const { trackError } = useAnalytics();

  const trackComponentError = useCallback((error: Error, errorInfo?: any) => {
    trackError(error, `Component: ${componentName}`);
    
    // Track additional error info if available
    if (errorInfo) {
      analytics.track('component_error_details', {
        component: componentName,
        errorInfo: JSON.stringify(errorInfo),
        timestamp: Date.now()
      });
    }
  }, [componentName, trackError]);

  return {
    trackComponentError
  };
};

// Hook para tracking de user engagement
export const useEngagementTracking = () => {
  const { trackInteraction, trackPerformance } = useAnalytics();
  const sessionStart = useRef<number>(Date.now());
  const lastActivity = useRef<number>(Date.now());
  const clickCount = useRef<number>(0);
  const scrollDepth = useRef<number>(0);

  useEffect(() => {
    // Verificar se analytics está habilitado
    const analyticsEnabled = import.meta.env.VITE_ANALYTICS_ENABLED === 'true' && import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
    if (!analyticsEnabled) {
      console.debug('[Analytics] Engagement tracking disabled in development');
      return;
    }
    const handleActivity = () => {
      lastActivity.current = Date.now();
    };

    const handleClick = () => {
      clickCount.current += 1;
      handleActivity();
    };

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > scrollDepth.current) {
        scrollDepth.current = scrollPercent;
        
        // Track scroll milestones
        if (scrollPercent >= 25 && scrollPercent < 50) {
          trackInteraction('scroll', '25%');
        } else if (scrollPercent >= 50 && scrollPercent < 75) {
          trackInteraction('scroll', '50%');
        } else if (scrollPercent >= 75 && scrollPercent < 100) {
          trackInteraction('scroll', '75%');
        } else if (scrollPercent >= 100) {
          trackInteraction('scroll', '100%');
        }
      }
      
      handleActivity();
    };

    // Add event listeners
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('mousemove', handleActivity);

    // Track engagement metrics periodically
    const engagementInterval = setInterval(() => {
      const sessionDuration = Date.now() - sessionStart.current;
      const timeSinceLastActivity = Date.now() - lastActivity.current;
      
      trackPerformance('session_duration', sessionDuration);
      trackPerformance('clicks_per_session', clickCount.current);
      trackPerformance('max_scroll_depth', scrollDepth.current);
      
      // Track if user is idle (no activity for 30 seconds)
      if (timeSinceLastActivity > 30000) {
        trackInteraction('user_idle', 'session');
      }
    }, 60000); // Every minute

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('mousemove', handleActivity);
      clearInterval(engagementInterval);
      
      // Track final session metrics
      const finalSessionDuration = Date.now() - sessionStart.current;
      trackPerformance('final_session_duration', finalSessionDuration);
      trackPerformance('final_click_count', clickCount.current);
      trackPerformance('final_scroll_depth', scrollDepth.current);
    };
  }, [trackInteraction, trackPerformance]);

  return {
    sessionDuration: Date.now() - sessionStart.current,
    clickCount: clickCount.current,
    scrollDepth: scrollDepth.current
  };
};