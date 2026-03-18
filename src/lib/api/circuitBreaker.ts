/**
 * Circuit Breaker Pattern Implementation
 * 
 * Prevents cascading failures by stopping calls to failing endpoints.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is tripped, no requests allowed
 * - HALF_OPEN: Testing if service recovered, allows one test request
 */

import { trackCircuitBreakerState } from './errorMonitoring';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold?: number;      // Number of failures before opening circuit
  recoveryTimeout?: number;       // Time in ms to wait before testing recovery
  monitoringPeriod?: number;      // Time window to count failures (ms)
  successThreshold?: number;      // Number of successes to close circuit from HALF_OPEN
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  nextAttemptTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private failureHistory: number[] = []; // Timestamps of recent failures

  constructor(
    private readonly config: CircuitBreakerConfig = {}
  ) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      recoveryTimeout: config.recoveryTimeout ?? 60000, // 1 minute default
      monitoringPeriod: config.monitoringPeriod ?? 300000, // 5 minutes window
      successThreshold: config.successThreshold ?? 2,
    };
  }

  private isFailureStale(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.monitoringPeriod!;
  }

  private cleanupStaleFailures(): void {
    this.failureHistory = this.failureHistory.filter(
      timestamp => !this.isFailureStale(timestamp)
    );
  }

  private updateState(): void {
    const now = Date.now();

    // Cleanup stale failures before checking threshold
    this.cleanupStaleFailures();
    this.failures = this.failureHistory.length;

    // Check if we should move from HALF_OPEN to OPEN or CLOSED
    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.config.successThreshold!) {
        this.reset();
      } else if (this.failures >= this.config.failureThreshold!) {
        this.open();
      }
    }

    // Check if we should move from OPEN to HALF_OPEN
    if (this.state === 'OPEN' && this.nextAttemptTime && now >= this.nextAttemptTime) {
      this.halfOpen();
    }

    // Check if we should open the circuit (from CLOSED or HALF_OPEN)
    if (this.state === 'CLOSED' && this.failures >= this.config.failureThreshold!) {
      this.open();
    }
  }

  private open(): void {
    if (this.state !== 'OPEN') {
      const previousState = this.state;
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout!;
      this.successes = 0;
      
      console.warn(`[CircuitBreaker] Circuit OPENED (${previousState} -> OPEN)`, {
        failures: this.failures,
        threshold: this.config.failureThreshold,
        nextAttemptAt: new Date(this.nextAttemptTime).toISOString()
      });
      
      // Track circuit breaker state change with Sentry
      trackCircuitBreakerState({
        path: this.getPath(),
        state: 'OPEN',
        failures: this.failures,
        reason: `Threshold of ${this.config.failureThreshold} failures reached`
      });
    }
  }

  private halfOpen(): void {
    if (this.state !== 'HALF_OPEN') {
      const previousState = this.state;
      this.state = 'HALF_OPEN';
      this.failures = 0;
      this.successes = 0;
      
      console.warn(`[CircuitBreaker] Circuit HALF_OPEN (${previousState} -> HALF_OPEN)`, {
        message: 'Testing if service has recovered'
      });
      
      // Track circuit breaker state change with Sentry
      trackCircuitBreakerState({
        path: this.getPath(),
        state: 'HALF_OPEN',
        failures: this.failures,
        reason: 'Testing service recovery'
      });
    }
  }

  private reset(): void {
    if (this.state !== 'CLOSED') {
      const previousState = this.state;
      this.state = 'CLOSED';
      this.failures = 0;
      this.successes = 0;
      this.failureHistory = [];
      this.lastFailureTime = null;
      this.nextAttemptTime = null;
      
      console.info(`[CircuitBreaker] Circuit CLOSED (${previousState} -> CLOSED)`, {
        message: 'Service recovered, circuit reset'
      });
      
      // Track circuit breaker state change with Sentry
      trackCircuitBreakerState({
        path: this.getPath(),
        state: 'CLOSED',
        failures: this.failures,
        reason: 'Service recovered'
      });
    }
  }
  
  /**
   * Get the path associated with this circuit breaker (for tracking)
   */
  private getPath(): string {
    return '/api/patients'; // Default, can be customized
  }

  private recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.successes++;
    
    // Remove oldest failure to help recover
    if (this.failureHistory.length > 0) {
      this.failureHistory.shift();
    }
    
    console.debug(`[CircuitBreaker] Success recorded`, {
      successes: this.successes,
      state: this.state
    });
  }

  private recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureHistory.push(now);
    this.failures = this.failureHistory.length;
    
    console.warn(`[CircuitBreaker] Failure recorded`, {
      failures: this.failures,
      state: this.state,
      threshold: this.config.failureThreshold
    });
  }

  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.updateState();

    // If circuit is OPEN, reject immediately
    if (this.state === 'OPEN') {
      const error = new Error(
        `Circuit breaker is OPEN. Service unavailable until ${this.nextAttemptTime ? new Date(this.nextAttemptTime).toLocaleTimeString() : 'later'}.`
      ) as Error & { isCircuitBreakerError: boolean };
      error.isCircuitBreakerError = true;
      throw error;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      this.updateState();
      return result;
    } catch (error) {
      this.recordFailure();
      this.updateState();
      
      // If we just opened the circuit, provide a more informative error
      if (this.state === 'OPEN') {
        const enhancedError = new Error(
          `Circuit breaker opened due to failures. Service will be retried after ${this.config.recoveryTimeout!}ms.`
        ) as Error & { 
          isCircuitBreakerError: boolean; 
          originalError: unknown 
        };
        enhancedError.isCircuitBreakerError = true;
        enhancedError.originalError = error;
        throw enhancedError;
      }
      
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker (for testing or admin)
   */
  manualReset(): void {
    this.reset();
  }

  /**
   * Force the circuit breaker into OPEN state (for testing or emergencies)
   */
  forceOpen(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout!;
    this.successes = 0;
    
    console.warn(`[CircuitBreaker] Circuit forced OPEN`, {
      message: 'Manual intervention'
    });
  }
}

// Singleton instance for patients endpoint
const patientsCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,              // Open after 5 failures
  recoveryTimeout: 60000,           // Wait 1 minute before retry
  monitoringPeriod: 300000,          // Count failures in 5-minute window
  successThreshold: 2,               // Need 2 successes to close from HALF_OPEN
});

export { patientsCircuitBreaker };

// Factory function to create circuit breakers for other endpoints
export function createCircuitBreaker(config?: CircuitBreakerConfig): CircuitBreaker {
  return new CircuitBreaker(config);
}

/**
 * Higher-order function to wrap async functions with circuit breaker protection
 */
export function withCircuitBreaker<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  circuitBreaker: CircuitBreaker
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    return circuitBreaker.execute(() => fn(...args));
  };
}
