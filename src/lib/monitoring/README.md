## Performance Monitoring Infrastructure

Comprehensive performance monitoring system for FisioFlow, tracking Core Web Vitals, query performance, component renders, and providing development warnings.

### Features

- ✅ **Core Web Vitals Tracking**: LCP, FID/INP, CLS, FCP, TTFB
- ✅ **Query Performance**: TanStack Query metrics, cache hit rates, slow queries
- ✅ **Component Profiling**: React Profiler integration for render performance
- ✅ **Development Warnings**: Real-time alerts for performance issues
- ✅ **Metrics Collection**: Centralized collection of all performance data
- ✅ **Production Monitoring**: Integration with Sentry and analytics

### Quick Start

#### 1. Initialize Monitoring

In your `App.tsx` or main entry point:

```typescript
import { initPerformanceMonitoring } from '@/lib/monitoring/initPerformanceMonitoring';
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  // your config
});

// Initialize monitoring with QueryClient
initPerformanceMonitoring(queryClient);
```

#### 2. Track Core Web Vitals

Core Web Vitals are automatically tracked when you initialize monitoring. To manually check metrics:

```typescript
import { getCoreWebVitals, checkPerformanceBudgets } from '@/lib/monitoring/coreWebVitals';

// Get current metrics
const metrics = getCoreWebVitals();
console.log('LCP:', metrics.lcp);
console.log('FID:', metrics.fid);
console.log('CLS:', metrics.cls);

// Check if metrics meet budgets
const { passed, violations } = checkPerformanceBudgets();
if (!passed) {
  console.warn('Performance budget violations:', violations);
}
```

#### 3. Profile Components

Wrap components with the Profiler to measure render performance:

```typescript
import { ProfilerWrapper, withProfiler } from '@/lib/monitoring/ReactProfiler';

// Option 1: Wrap component directly
function MyComponent() {
  return (
    <ProfilerWrapper id="MyComponent">
      <div>Content</div>
    </ProfilerWrapper>
  );
}

// Option 2: Use HOC
const ProfiledComponent = withProfiler(MyComponent, 'MyComponent');
```

#### 4. Track Query Performance

Query performance is automatically tracked when you initialize monitoring with a QueryClient. To manually check stats:

```typescript
import { getQueryStats, getSlowQueries } from '@/lib/monitoring/queryPerformance';

// Get overall stats
const stats = getQueryStats();
console.log('Cache hit rate:', stats.cacheHitRate);
console.log('Average duration:', stats.averageDuration);

// Get slow queries
const slowQueries = getSlowQueries(1000); // queries > 1000ms
console.log('Slow queries:', slowQueries);
```

#### 5. Development Warnings

Development warnings are automatically enabled in dev mode. They will alert you to:

- Slow renders (>16ms)
- Excessive re-renders (>10 in short period)
- Large state objects
- Missing memoization
- Unoptimized images
- Potential memory leaks
- Blocking operations

### API Reference

#### Core Web Vitals

```typescript
// Initialize tracking
await initCoreWebVitals();

// Get current metrics
const metrics = getCoreWebVitals();

// Check performance budgets
const { passed, violations } = checkPerformanceBudgets();
```

#### Query Performance

```typescript
// Configure QueryClient with tracking
configureQueryClientWithTracking(queryClient);

// Get query statistics
const stats = getQueryStats(); // all queries
const specificStats = getQueryStats('patients-list'); // specific query

// Get slow queries
const slowQueries = getSlowQueries(1000); // threshold in ms

// Export metrics for analysis
const metrics = exportQueryMetrics();
```

#### Component Profiling

```typescript
// Wrap component with profiler
<ProfilerWrapper id="ComponentName">
  <YourComponent />
</ProfilerWrapper>

// Use HOC
const ProfiledComponent = withProfiler(YourComponent);

// Measure async operations
const result = await measureAsync('fetchData', async () => {
  return await fetchData();
});

// Measure sync operations
const result = measureSync('computeValue', () => {
  return expensiveComputation();
});
```

#### Development Warnings

```typescript
// Warn about slow render
warnSlowRender('ComponentName', 50); // duration in ms

// Warn about excessive re-renders
warnExcessiveRenders('ComponentName');

// Warn about large state
warnLargeState('ComponentName', 2048); // size in bytes

// Warn about missing memoization
warnMissingMemoization('ComponentName', 'propName', 'object');

// Warn about unoptimized image
warnUnoptimizedImage('/path/to/image.jpg', 1024 * 1024); // size in bytes

// Warn about potential memory leak
warnPotentialMemoryLeak('ComponentName', 'event-listener');

// Warn about blocking operation
warnBlockingOperation('heavyComputation', 100); // duration in ms
```

#### Metrics Collector

```typescript
// Get page load metrics
const pageMetrics = metricsCollector.getPageMetrics();

// Get component metrics
const allComponents = metricsCollector.getComponentMetrics();
const specificComponent = metricsCollector.getComponentMetrics('MyComponent');

// Get resource metrics
const allResources = metricsCollector.getResourceMetrics();
const scripts = metricsCollector.getResourceMetrics('script');

// Get performance summary
const summary = metricsCollector.getSummary();

// Export all metrics
const exportedData = metricsCollector.export();
```

### Performance Budgets

The system enforces the following performance budgets:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **FCP** (First Contentful Paint): < 1.8s
- **TTFB** (Time to First Byte): < 800ms

### Development Tools

In development mode, the following tools are available in the browser console:

```javascript
// Access metrics collector
window.__metricsCollector.getSummary()
window.__metricsCollector.export()

// Access performance monitor
window.__perfMonitor.getStats('ComponentName')
window.__perfMonitor.reportSummary()
```

### Integration with Existing Monitoring

The system integrates with:

- **Sentry**: Automatic error tracking and performance monitoring
- **Google Analytics**: Custom events for performance metrics
- **Firebase Analytics**: Business metrics and user behavior

### Best Practices

1. **Initialize Early**: Call `initPerformanceMonitoring()` as early as possible in your app
2. **Profile Strategically**: Don't profile every component, focus on complex/slow ones
3. **Monitor in Production**: Core Web Vitals are most valuable with real user data
4. **Act on Warnings**: Development warnings indicate real issues that affect UX
5. **Review Regularly**: Check metrics summary periodically to catch regressions

### Troubleshooting

**Monitoring not working?**
- Check that `initPerformanceMonitoring()` is called
- Verify `web-vitals` package is installed
- Check browser console for errors

**No development warnings?**
- Warnings only appear in development mode
- Check that `import.meta.env.DEV` is true

**Query tracking not working?**
- Ensure QueryClient is passed to `initPerformanceMonitoring()`
- Check that queries are using the configured QueryClient

### Files

- `index.ts` - Main monitoring exports and Sentry integration
- `coreWebVitals.ts` - Core Web Vitals tracking (LCP, FID, CLS, etc.)
- `queryPerformance.ts` - TanStack Query performance tracking
- `devWarnings.ts` - Development mode performance warnings
- `ReactProfiler.tsx` - React Profiler wrapper and utilities
- `metricsCollector.ts` - Centralized metrics collection
- `initPerformanceMonitoring.ts` - Initialization and setup
- `performance.ts` - Legacy performance monitoring (kept for compatibility)
- `PerformanceMonitor.tsx` - Legacy component profiling (kept for compatibility)
- `web-vitals.tsx` - Web Vitals React components and hooks
- `web-vitals-ratings.ts` - Web Vitals rating thresholds
- `sentry.ts` - Sentry configuration
