/**
 * Tests for Schedule Performance Monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DragFrameRateMonitor,
  ViewSwitchTimer,
  CacheHitRateTracker,
  PERFORMANCE_THRESHOLDS,
} from '../schedulePerformance';

describe('DragFrameRateMonitor', () => {
  let monitor: DragFrameRateMonitor;

  beforeEach(() => {
    monitor = new DragFrameRateMonitor();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should start monitoring', () => {
    expect(monitor.isActive()).toBe(false);
    monitor.start();
    expect(monitor.isActive()).toBe(true);
  });

  it('should stop monitoring and return average FPS', () => {
    monitor.start();
    
    // Simulate some frames
    vi.advanceTimersByTime(100);
    
    const avgFps = monitor.stop();
    expect(monitor.isActive()).toBe(false);
    expect(typeof avgFps).toBe('number');
  });

  it('should not start monitoring twice', () => {
    monitor.start();
    const firstStart = monitor.isActive();
    monitor.start();
    const secondStart = monitor.isActive();
    
    expect(firstStart).toBe(true);
    expect(secondStart).toBe(true);
  });

  it('should return 0 FPS when stopped without starting', () => {
    const avgFps = monitor.stop();
    expect(avgFps).toBe(0);
  });

  it('should return current FPS', () => {
    monitor.start();
    const currentFps = monitor.getCurrentFps();
    expect(typeof currentFps).toBe('number');
    expect(currentFps).toBeGreaterThanOrEqual(0);
    monitor.stop();
  });
});

describe('ViewSwitchTimer', () => {
  let timer: ViewSwitchTimer;

  beforeEach(() => {
    timer = new ViewSwitchTimer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should measure view switch duration', () => {
    timer.start('week');
    vi.advanceTimersByTime(50);
    const duration = timer.end();
    
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should return 0 if end called without start', () => {
    const duration = timer.end();
    expect(duration).toBe(0);
  });

  it('should track different view types', () => {
    const viewTypes: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    
    viewTypes.forEach(viewType => {
      timer.start(viewType);
      vi.advanceTimersByTime(30);
      const duration = timer.end();
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  it('should reset after end', () => {
    timer.start('day');
    vi.advanceTimersByTime(50);
    timer.end();
    
    // Second end should return 0
    const duration = timer.end();
    expect(duration).toBe(0);
  });
});

describe('CacheHitRateTracker', () => {
  let tracker: CacheHitRateTracker;

  beforeEach(() => {
    tracker = new CacheHitRateTracker();
  });

  it('should start with 0% hit rate', () => {
    expect(tracker.getHitRate()).toBe(0);
    expect(tracker.getHitRatePercentage()).toBe(0);
  });

  it('should calculate hit rate correctly', () => {
    tracker.recordHit();
    tracker.recordHit();
    tracker.recordMiss();
    
    expect(tracker.getHitRate()).toBeCloseTo(2 / 3);
    expect(tracker.getHitRatePercentage()).toBeCloseTo(66.67, 1);
  });

  it('should handle 100% hit rate', () => {
    tracker.recordHit();
    tracker.recordHit();
    tracker.recordHit();
    
    expect(tracker.getHitRate()).toBe(1);
    expect(tracker.getHitRatePercentage()).toBe(100);
  });

  it('should handle 0% hit rate', () => {
    tracker.recordMiss();
    tracker.recordMiss();
    tracker.recordMiss();
    
    expect(tracker.getHitRate()).toBe(0);
    expect(tracker.getHitRatePercentage()).toBe(0);
  });

  it('should reset counters', () => {
    tracker.recordHit();
    tracker.recordMiss();
    
    expect(tracker.getHitRate()).toBeGreaterThan(0);
    
    tracker.reset();
    
    expect(tracker.getHitRate()).toBe(0);
    expect(tracker.getHitRatePercentage()).toBe(0);
  });

  it('should track mixed hits and misses', () => {
    // 7 hits, 3 misses = 70% hit rate
    for (let i = 0; i < 7; i++) {
      tracker.recordHit();
    }
    for (let i = 0; i < 3; i++) {
      tracker.recordMiss();
    }
    
    expect(tracker.getHitRate()).toBe(0.7);
    expect(tracker.getHitRatePercentage()).toBe(70);
  });
});

describe('Performance Thresholds', () => {
  it('should have correct threshold values', () => {
    expect(PERFORMANCE_THRESHOLDS.LCP).toBe(2500);
    expect(PERFORMANCE_THRESHOLDS.INP).toBe(200);
    expect(PERFORMANCE_THRESHOLDS.CLS).toBe(0.1);
    expect(PERFORMANCE_THRESHOLDS.VIEW_SWITCH).toBe(100);
    expect(PERFORMANCE_THRESHOLDS.DRAG_FPS).toBe(60);
  });
});

describe('Integration scenarios', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should handle complete drag operation monitoring', () => {
    const monitor = new DragFrameRateMonitor();
    
    // Start drag
    monitor.start();
    expect(monitor.isActive()).toBe(true);
    
    // Simulate drag in progress
    const currentFps = monitor.getCurrentFps();
    expect(typeof currentFps).toBe('number');
    
    // End drag
    const avgFps = monitor.stop();
    expect(monitor.isActive()).toBe(false);
    expect(typeof avgFps).toBe('number');
  });

  it('should handle multiple view switches', () => {
    const timer = new ViewSwitchTimer();
    
    // Switch to week view
    timer.start('week');
    vi.advanceTimersByTime(50);
    const weekDuration = timer.end();
    expect(weekDuration).toBeGreaterThanOrEqual(0);
    
    // Switch to day view
    timer.start('day');
    vi.advanceTimersByTime(30);
    const dayDuration = timer.end();
    expect(dayDuration).toBeGreaterThanOrEqual(0);
    
    // Switch to month view
    timer.start('month');
    vi.advanceTimersByTime(80);
    const monthDuration = timer.end();
    expect(monthDuration).toBeGreaterThanOrEqual(0);
  });

  it('should track cache performance over time', () => {
    const tracker = new CacheHitRateTracker();
    
    // Simulate cache usage pattern
    tracker.recordHit();
    tracker.recordHit();
    tracker.recordMiss();
    tracker.recordHit();
    tracker.recordHit();
    tracker.recordHit();
    tracker.recordMiss();
    tracker.recordHit();
    tracker.recordHit();
    tracker.recordHit();
    
    // 8 hits, 2 misses = 80% hit rate
    expect(tracker.getHitRatePercentage()).toBe(80);
  });
});
