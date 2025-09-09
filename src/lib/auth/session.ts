import { supabase } from '@/integrations/supabase/client';
import { errorLogger } from '@/lib/errors/logger';

export interface SessionInfo {
  isValid: boolean;
  expiresAt: number | null;
  refreshToken: string | null;
  accessToken: string | null;
  userId: string | null;
  timeUntilExpiry: number | null;
}

/**
 * Get current session information
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      errorLogger.logError(error, {
        context: 'session.getSessionInfo'
      });
      return {
        isValid: false,
        expiresAt: null,
        refreshToken: null,
        accessToken: null,
        userId: null,
        timeUntilExpiry: null
      };
    }

    if (!session) {
      return {
        isValid: false,
        expiresAt: null,
        refreshToken: null,
        accessToken: null,
        userId: null,
        timeUntilExpiry: null
      };
    }

    const now = Date.now() / 1000;
    const expiresAt = session.expires_at || 0;
    const timeUntilExpiry = Math.max(0, expiresAt - now);

    return {
      isValid: timeUntilExpiry > 0,
      expiresAt: expiresAt * 1000, // Convert to milliseconds
      refreshToken: session.refresh_token,
      accessToken: session.access_token,
      userId: session.user?.id || null,
      timeUntilExpiry: timeUntilExpiry * 1000 // Convert to milliseconds
    };
  } catch (error) {
    errorLogger.logError(error as Error, {
      context: 'session.getSessionInfo'
    });
    return {
      isValid: false,
      expiresAt: null,
      refreshToken: null,
      accessToken: null,
      userId: null,
      timeUntilExpiry: null
    };
  }
}

/**
 * Check if session will expire soon (within 5 minutes)
 */
export async function isSessionExpiringSoon(): Promise<boolean> {
  const sessionInfo = await getSessionInfo();
  if (!sessionInfo.isValid || !sessionInfo.timeUntilExpiry) {
    return true;
  }
  
  // Check if expires within 5 minutes (300000 ms)
  return sessionInfo.timeUntilExpiry < 300000;
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<{success: boolean, error?: Error}> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      errorLogger.logError(error, {
        context: 'session.refreshSession'
      });
      return { success: false, error };
    }

    if (!data.session) {
      const noSessionError = new Error('No session returned after refresh');
      errorLogger.logError(noSessionError, {
        context: 'session.refreshSession'
      });
      return { success: false, error: noSessionError };
    }

    errorLogger.logInfo('Session refreshed successfully', {
      context: 'session.refreshSession',
      userId: data.session.user?.id
    });

    return { success: true };
  } catch (error) {
    errorLogger.logError(error as Error, {
      context: 'session.refreshSession'
    });
    return { success: false, error: error as Error };
  }
}

/**
 * Clear session data from localStorage
 */
export function clearSessionData(): void {
  try {
    // Clear Supabase auth token
    localStorage.removeItem('supabase.auth.token');
    
    // Clear any other auth-related items
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear session storage
    sessionStorage.clear();
    
    errorLogger.logInfo('Session data cleared', {
      context: 'session.clearSessionData',
      keysCleared: authKeys.length
    });
  } catch (error) {
    errorLogger.logError(error as Error, {
      context: 'session.clearSessionData'
    });
  }
}

/**
 * Set up automatic session refresh
 */
export function setupAutoRefresh(onSessionExpired?: () => void): () => void {
  let timeoutId: NodeJS.Timeout;

  const scheduleRefresh = async () => {
    try {
      const sessionInfo = await getSessionInfo();
      
      if (!sessionInfo.isValid) {
        onSessionExpired?.();
        return;
      }

      if (!sessionInfo.timeUntilExpiry) {
        return;
      }

      // Schedule refresh 5 minutes before expiry
      const refreshTime = Math.max(0, sessionInfo.timeUntilExpiry - 300000);
      
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const refreshResult = await refreshSession();
        
        if (!refreshResult.success) {
          onSessionExpired?.();
          return;
        }
        
        // Schedule next refresh
        scheduleRefresh();
      }, refreshTime);

      errorLogger.logInfo('Session refresh scheduled', {
        context: 'session.setupAutoRefresh',
        refreshInMs: refreshTime
      });
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'session.setupAutoRefresh'
      });
      onSessionExpired?.();
    }
  };

  // Initial schedule
  scheduleRefresh();

  // Check every 30 seconds if we need to update the schedule
  const intervalId = setInterval(() => {
    scheduleRefresh();
  }, 30000);

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    clearInterval(intervalId);
  };
}

/**
 * Force logout and clear all session data
 */
export async function forceLogout(): Promise<void> {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear session data
    clearSessionData();
    
    errorLogger.logInfo('Force logout completed', {
      context: 'session.forceLogout'
    });
  } catch (error) {
    errorLogger.logError(error as Error, {
      context: 'session.forceLogout'
    });
    
    // Even if signOut fails, clear local data
    clearSessionData();
  }
}

/**
 * Get session validity status
 */
export async function getSessionStatus(): Promise<{
  status: 'valid' | 'expired' | 'expiring_soon' | 'invalid';
  timeUntilExpiry?: number;
  shouldRefresh: boolean;
}> {
  const sessionInfo = await getSessionInfo();
  
  if (!sessionInfo.isValid) {
    return {
      status: 'invalid',
      shouldRefresh: false
    };
  }
  
  if (!sessionInfo.timeUntilExpiry) {
    return {
      status: 'expired',
      shouldRefresh: true
    };
  }
  
  // Expired
  if (sessionInfo.timeUntilExpiry <= 0) {
    return {
      status: 'expired',
      timeUntilExpiry: 0,
      shouldRefresh: true
    };
  }
  
  // Expiring within 5 minutes
  if (sessionInfo.timeUntilExpiry < 300000) {
    return {
      status: 'expiring_soon',
      timeUntilExpiry: sessionInfo.timeUntilExpiry,
      shouldRefresh: true
    };
  }
  
  // Valid
  return {
    status: 'valid',
    timeUntilExpiry: sessionInfo.timeUntilExpiry,
    shouldRefresh: false
  };
}