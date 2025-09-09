import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { 
  getSessionStatus, 
  refreshSession, 
  forceLogout
} from '@/lib/auth/session';
import { errorLogger } from '@/lib/errors/logger';
import { toast } from '@/hooks/use-toast';

interface SessionMonitorState {
  status: 'valid' | 'expired' | 'expiring_soon' | 'invalid';
  timeUntilExpiry?: number;
  lastChecked: number;
  autoRefreshEnabled: boolean;
  warningShown: boolean;
}

interface UseSessionMonitorOptions {
  checkInterval?: number; // in milliseconds
  warningThreshold?: number; // in milliseconds
  autoRefresh?: boolean;
  showToastWarnings?: boolean;
}

/**
 * Hook to monitor session status and handle automatic refresh
 */
export function useSessionMonitor(options: UseSessionMonitorOptions = {}) {
  const {
    checkInterval = 60000, // Check every minute
    // warningThreshold = 300000, // Warn 5 minutes before expiry
    autoRefresh = true,
    showToastWarnings = true
  } = options;

  const { user, signOut } = useAuth();
  
  const [sessionState, setSessionState] = useState<SessionMonitorState>({
    status: 'valid',
    lastChecked: Date.now(),
    autoRefreshEnabled: autoRefresh,
    warningShown: false
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();

  const checkSession = useCallback(async () => {
    if (!user) {
      setSessionState(prev => ({ ...prev, status: 'invalid' }));
      return;
    }

    try {
      const sessionStatus = await getSessionStatus();
      const now = Date.now();
      
      setSessionState(prev => ({
        ...prev,
        status: sessionStatus.status,
        timeUntilExpiry: sessionStatus.timeUntilExpiry,
        lastChecked: now,
        warningShown: sessionStatus.status !== 'expiring_soon' ? false : prev.warningShown
      }));

      // Handle different session states
      switch (sessionStatus.status) {
        case 'expired':
        case 'invalid':
          errorLogger.logWarning('Session expired or invalid, signing out', {
            context: 'useSessionMonitor.checkSession',
            status: sessionStatus.status
          });
          await signOut();
          break;

        case 'expiring_soon':
          if (autoRefresh) {
            errorLogger.logInfo('Session expiring soon, attempting refresh', {
              context: 'useSessionMonitor.checkSession',
              timeUntilExpiry: sessionStatus.timeUntilExpiry
            });
            
            const refreshResult = await refreshSession();
            
            if (refreshResult.success) {
              errorLogger.logInfo('Session refreshed successfully', {
                context: 'useSessionMonitor.checkSession'
              });
              
              // Recheck session after refresh
              const newStatus = await getSessionStatus();
              setSessionState(prev => ({
                ...prev,
                status: newStatus.status,
                timeUntilExpiry: newStatus.timeUntilExpiry,
                warningShown: false
              }));
            } else {
              errorLogger.logError(refreshResult.error || new Error('Session refresh failed'), {
                context: 'useSessionMonitor.checkSession'
              });
              
              if (showToastWarnings) {
                toast({
                  title: 'Sessão expirando',
                  description: 'Não foi possível renovar sua sessão. Você será desconectado em breve.',
                  variant: 'destructive'
                });
              }
            }
          } else if (showToastWarnings && !sessionState.warningShown) {
            const minutes = Math.ceil((sessionStatus.timeUntilExpiry || 0) / 60000);
            toast({
              title: 'Sessão expirando',
              description: `Sua sessão expirará em ${minutes} minuto(s). Faça login novamente para continuar.`,
              variant: 'destructive'
            });
            
            setSessionState(prev => ({ ...prev, warningShown: true }));
          }
          break;

        case 'valid':
          // Session is healthy
          break;
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'useSessionMonitor.checkSession'
      });
      
      setSessionState(prev => ({ ...prev, status: 'invalid' }));
    }
  }, [user, signOut, autoRefresh, showToastWarnings, sessionState.warningShown]);

  // Force refresh session
  const forceRefresh = useCallback(async () => {
    if (!user) return { success: false, error: new Error('No user session') };
    
    try {
      const result = await refreshSession();
      if (result.success) {
        await checkSession();
      }
      return result;
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }, [user, checkSession]);

  // Force logout
  const forceSignOut = useCallback(async () => {
    try {
      await forceLogout();
      await signOut();
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'useSessionMonitor.forceSignOut'
      });
    }
  }, [signOut]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (user) {
      checkSession(); // Initial check
      intervalRef.current = setInterval(checkSession, checkInterval);
      
      errorLogger.logInfo('Session monitoring started', {
        context: 'useSessionMonitor.startMonitoring',
        checkInterval
      });
    }
  }, [user, checkSession, checkInterval]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = undefined;
    }
    
    errorLogger.logInfo('Session monitoring stopped', {
      context: 'useSessionMonitor.stopMonitoring'
    });
  }, []);

  // Set up monitoring when user changes
  useEffect(() => {
    if (user) {
      startMonitoring();
    } else {
      stopMonitoring();
      setSessionState({
        status: 'invalid',
        lastChecked: Date.now(),
        autoRefreshEnabled: autoRefresh,
        warningShown: false
      });
    }

    return () => {
      stopMonitoring();
    };
  }, [user, startMonitoring, stopMonitoring, autoRefresh]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    sessionStatus: sessionState.status,
    timeUntilExpiry: sessionState.timeUntilExpiry,
    lastChecked: sessionState.lastChecked,
    isMonitoring: !!intervalRef.current,
    forceRefresh,
    forceSignOut,
    startMonitoring,
    stopMonitoring,
    
    // Computed properties
    isExpired: sessionState.status === 'expired' || sessionState.status === 'invalid',
    isExpiringSoon: sessionState.status === 'expiring_soon',
    isValid: sessionState.status === 'valid',
    shouldRefresh: sessionState.status === 'expiring_soon' || sessionState.status === 'expired',
    
    // Time formatting helpers
    getTimeUntilExpiryFormatted: () => {
      if (!sessionState.timeUntilExpiry) return null;
      
      const minutes = Math.floor(sessionState.timeUntilExpiry / 60000);
      const seconds = Math.floor((sessionState.timeUntilExpiry % 60000) / 1000);
      
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    }
  };
}

export default useSessionMonitor;