import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';
import { errorLogger } from '@/lib/errors/logger';
import { toast } from '@/hooks/use-toast';

interface SecurityContextType {
  // Session monitoring
  sessionStatus: 'valid' | 'expired' | 'expiring_soon' | 'invalid';
  timeUntilExpiry?: number;
  isSessionValid: boolean;
  
  // Security features
  loginAttempts: number;
  isAccountLocked: boolean;
  lockoutEndTime?: number;
  
  // Actions
  refreshSession: () => Promise<{success: boolean, error?: Error}>;
  reportFailedLogin: () => void;
  resetLoginAttempts: () => void;
  
  // Activity tracking
  lastActivity: number;
  isActive: boolean;
  
  // Security settings
  enableAutoLogout: boolean;
  inactivityTimeout: number;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
  options?: {
    maxLoginAttempts?: number;
    lockoutDuration?: number; // in milliseconds
    inactivityTimeout?: number; // in milliseconds
    enableAutoLogout?: boolean;
    sessionCheckInterval?: number; // in milliseconds
  };
}

export function SecurityProvider({ children, options = {} }: SecurityProviderProps) {
  const {
    maxLoginAttempts = 5,
    lockoutDuration = 15 * 60 * 1000, // 15 minutes
    inactivityTimeout = 30 * 60 * 1000, // 30 minutes
    enableAutoLogout = true,
    sessionCheckInterval = 60000 // 1 minute
  } = options;

  const { user, signOut } = useAuth();
  
  const {
    sessionStatus,
    timeUntilExpiry,
    isValid: isSessionValid,
    forceRefresh,
    forceSignOut
  } = useSessionMonitor({
    checkInterval: sessionCheckInterval,
    autoRefresh: true,
    showToastWarnings: true
  });

  // Login attempt tracking
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutEndTime, setLockoutEndTime] = useState<number>();
  
  // Activity tracking
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isActive, setIsActive] = useState(true);

  // Load persisted security data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('fisioflow_security');
      if (stored) {
        const data = JSON.parse(stored);
        setLoginAttempts(data.loginAttempts || 0);
        if (data.lockoutEndTime && data.lockoutEndTime > Date.now()) {
          setLockoutEndTime(data.lockoutEndTime);
        }
      }
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'SecurityProvider.loadPersistedData'
      });
    }
  }, []);

  // Persist security data
  useEffect(() => {
    try {
      const data = {
        loginAttempts,
        lockoutEndTime
      };
      localStorage.setItem('fisioflow_security', JSON.stringify(data));
    } catch (error) {
      errorLogger.logError(error as Error, {
        context: 'SecurityProvider.persistData'
      });
    }
  }, [loginAttempts, lockoutEndTime]);

  // Activity tracking setup
  useEffect(() => {
    if (!user || !enableAutoLogout) return;

    const updateActivity = () => {
      setLastActivity(Date.now());
      setIsActive(true);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [user, enableAutoLogout]);

  // Inactivity monitoring
  useEffect(() => {
    if (!user || !enableAutoLogout) return;

    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      
      if (timeSinceLastActivity > inactivityTimeout) {
        setIsActive(false);
        
        errorLogger.logInfo('User inactive, signing out due to inactivity', {
          context: 'SecurityProvider.inactivityCheck',
          timeSinceLastActivity,
          inactivityTimeout
        });
        
        toast({
          title: 'Sessão encerrada',
          description: 'Você foi desconectado devido à inatividade.',
          variant: 'default'
        });
        
        forceSignOut();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInactivity);
  }, [user, lastActivity, inactivityTimeout, enableAutoLogout, forceSignOut]);

  // Account lockout monitoring
  useEffect(() => {
    if (!lockoutEndTime) return;

    const checkLockout = setInterval(() => {
      if (Date.now() > lockoutEndTime) {
        setLockoutEndTime(undefined);
        setLoginAttempts(0);
        
        errorLogger.logInfo('Account lockout expired', {
          context: 'SecurityProvider.lockoutCheck'
        });
      }
    }, 1000);

    return () => clearInterval(checkLockout);
  }, [lockoutEndTime]);

  // Report failed login attempt
  const reportFailedLogin = () => {
    const newAttempts = loginAttempts + 1;
    setLoginAttempts(newAttempts);
    
    errorLogger.logWarning('Failed login attempt recorded', {
      context: 'SecurityProvider.reportFailedLogin',
      attempts: newAttempts,
      maxAttempts: maxLoginAttempts
    });
    
    if (newAttempts >= maxLoginAttempts) {
      const lockoutEnd = Date.now() + lockoutDuration;
      setLockoutEndTime(lockoutEnd);
      
      errorLogger.logWarning('Account locked due to too many failed attempts', {
        context: 'SecurityProvider.reportFailedLogin',
        lockoutDuration,
        lockoutEndTime: lockoutEnd
      });
      
      toast({
        title: 'Conta temporariamente bloqueada',
        description: `Muitas tentativas de login falharam. Tente novamente em ${Math.ceil(lockoutDuration / 60000)} minutos.`,
        variant: 'destructive'
      });
    }
  };

  // Reset login attempts (on successful login)
  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setLockoutEndTime(undefined);
    
    errorLogger.logInfo('Login attempts reset', {
      context: 'SecurityProvider.resetLoginAttempts'
    });
  };

  // Reset on successful authentication
  useEffect(() => {
    if (user) {
      resetLoginAttempts();
    }
  }, [user]);

  const contextValue: SecurityContextType = {
    // Session monitoring
    sessionStatus,
    timeUntilExpiry,
    isSessionValid,
    
    // Security features
    loginAttempts,
    isAccountLocked: !!lockoutEndTime && lockoutEndTime > Date.now(),
    lockoutEndTime,
    
    // Actions
    refreshSession: forceRefresh,
    reportFailedLogin,
    resetLoginAttempts,
    
    // Activity tracking
    lastActivity,
    isActive,
    
    // Security settings
    enableAutoLogout,
    inactivityTimeout,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}

// Security status component for debugging/admin
export function SecurityStatus() {
  const security = useSecurity();
  const { user, role } = useAuth();
  
  if (!user || role !== 'admin') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg text-xs">
      <h4 className="font-semibold mb-2">Security Status</h4>
      <div className="space-y-1">
        <div>Session: {security.sessionStatus}</div>
        {security.timeUntilExpiry && (
          <div>Expires in: {Math.ceil(security.timeUntilExpiry / 60000)}m</div>
        )}
        <div>Active: {security.isActive ? 'Yes' : 'No'}</div>
        <div>Attempts: {security.loginAttempts}</div>
        {security.isAccountLocked && (
          <div className="text-red-500">Account Locked</div>
        )}
      </div>
    </div>
  );
}

export default SecurityProvider;