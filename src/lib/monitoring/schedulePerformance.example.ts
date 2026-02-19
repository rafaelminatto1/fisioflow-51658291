/**
 * Usage Examples for Schedule Performance Monitoring
 * 
 * This file demonstrates how to use the schedule performance monitoring utilities
 * in the Schedule page and related components.
 */

import { useEffect } from 'react';
import {
  initScheduleWebVitals,
  dragFrameRateMonitor,
  viewSwitchTimer,
  cacheHitRateTracker,
  useSchedulePerformance,
  logPerformanceSummary,
} from './schedulePerformance';

/**
 * Example 1: Initialize Web Vitals tracking in Schedule page
 */
export function SchedulePageExample() {
  useEffect(() => {
    // Initialize Web Vitals tracking when component mounts
    initScheduleWebVitals();
  }, []);

  return <div>Schedule Content</div>;
}

/**
 * Example 2: Monitor drag and drop performance
 */
export function DragDropExample() {
  const handleDragStart = () => {
    // Start monitoring frame rate when drag begins
    dragFrameRateMonitor.start();
  };

  const handleDragEnd = () => {
    // Stop monitoring and log average FPS
    const avgFps = dragFrameRateMonitor.stop();
    console.log(`Drag operation completed with ${avgFps.toFixed(2)} FPS`);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      Draggable Item
    </div>
  );
}

/**
 * Example 3: Track view switch timing
 */
export function ViewSwitchExample() {
  const handleViewChange = (newView: 'day' | 'week' | 'month') => {
    // Start timing the view switch
    viewSwitchTimer.start(newView);

    // Perform view switch logic...
    // (load data, render new view, etc.)

    // End timing after view is rendered
    requestAnimationFrame(() => {
      const duration = viewSwitchTimer.end();
      console.log(`View switch took ${duration.toFixed(2)}ms`);
    });
  };

  return (
    <div>
      <button onClick={() => handleViewChange('day')}>Day</button>
      <button onClick={() => handleViewChange('week')}>Week</button>
      <button onClick={() => handleViewChange('month')}>Month</button>
    </div>
  );
}

/**
 * Example 4: Track cache hit rate
 */
export function CacheTrackingExample() {
  const fetchAppointments = async (useCache: boolean) => {
    if (useCache) {
      // Data served from cache
      cacheHitRateTracker.recordHit();
      return getCachedData();
    } else {
      // Data fetched from server
      cacheHitRateTracker.recordMiss();
      return fetchFromServer();
    }
  };

  const showCacheStats = () => {
    const hitRate = cacheHitRateTracker.getHitRatePercentage();
    console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
  };

  return (
    <div>
      <button onClick={() => fetchAppointments(true)}>Load from Cache</button>
      <button onClick={() => fetchAppointments(false)}>Load from Server</button>
      <button onClick={showCacheStats}>Show Cache Stats</button>
    </div>
  );
}

/**
 * Example 5: Use the performance hook
 */
export function PerformanceHookExample() {
  const {
    dragFrameRateMonitor,
    viewSwitchTimer,
    cacheHitRateTracker,
    initWebVitals,
  } = useSchedulePerformance();

  useEffect(() => {
    // Initialize Web Vitals
    initWebVitals();

    // Log performance summary on unmount
    return () => {
      logPerformanceSummary();
    };
  }, [initWebVitals]);

  return <div>Component with performance monitoring</div>;
}

/**
 * Example 6: Complete Schedule page integration
 */
export function CompleteScheduleExample() {
  const { initWebVitals } = useSchedulePerformance();

  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals();

    // Log performance summary when leaving the page
    return () => {
      if (import.meta.env.DEV) {
        logPerformanceSummary();
      }
    };
  }, [initWebVitals]);

  const handleDragStart = () => {
    dragFrameRateMonitor.start();
  };

  const handleDragEnd = () => {
    dragFrameRateMonitor.stop();
  };

  const handleViewChange = (view: 'day' | 'week' | 'month') => {
    viewSwitchTimer.start(view);
    
    // Perform view change...
    
    requestAnimationFrame(() => {
      viewSwitchTimer.end();
    });
  };

  return (
    <div>
      <div>View Controls</div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        Appointment Card
      </div>
    </div>
  );
}

// Helper functions (mock implementations)
function getCachedData() {
  return Promise.resolve([]);
}

function fetchFromServer() {
  return Promise.resolve([]);
}
