# Notification System Test Suite

This directory contains comprehensive tests for the FisioFlow push notification system.

## Test Structure

### Unit Tests
- `src/lib/services/__tests__/NotificationManager.test.ts` - Tests for the NotificationManager service
- `src/hooks/__tests__/useNotifications.test.ts` - Tests for the useNotifications hook
- `src/components/notifications/__tests__/NotificationCenter.test.tsx` - Tests for the NotificationCenter component

### Integration Tests
- `src/__tests__/integration/notificationFlow.test.ts` - End-to-end notification flow tests
- Tests complete user workflows from permission request to notification display

### Browser Compatibility Tests
- `src/__tests__/browser/compatibility.test.ts` - Cross-browser compatibility tests
- Tests Chrome, Firefox, Safari, Edge, and mobile browsers
- Includes PWA and service worker compatibility tests

### Performance Tests
- `src/__tests__/performance/notificationPerformance.test.ts` - Performance and load tests
- Tests notification delivery speed, memory usage, and concurrent operations

### Service Worker Tests
- `src/__tests__/serviceWorker.test.ts` - Service worker functionality tests
- Tests push event handling, notification clicks, and background sync

### Supabase Edge Function Tests
- `supabase/functions/__tests__/send-notification.test.ts` - Tests for notification sending
- `supabase/functions/__tests__/schedule-notifications.test.ts` - Tests for notification scheduling

## Test Utilities

### `src/__tests__/testUtils.ts`
Provides common test utilities:
- `createMockSupabaseClient()` - Mock Supabase client
- `createMockNotification()` - Mock notification objects
- `createMockSubscription()` - Mock push subscriptions
- `createMockPreferences()` - Mock user preferences
- `setupBrowserMocks()` - Browser API mocks

### `src/test/setup.ts`
Global test setup and configuration:
- Browser API mocks (Notification, ServiceWorker, PushManager)
- Supabase client mocks
- Environment variable setup

## Running Tests

### All Tests
```bash
npm run test
```

### Specific Test Categories
```bash
# Unit tests only
npx vitest run src/lib src/hooks src/components

# Integration tests
npx vitest run src/__tests__/integration

# Performance tests
npx vitest run src/__tests__/performance

# Browser compatibility tests
npx vitest run src/__tests__/browser

# Service worker tests
npx vitest run src/__tests__/serviceWorker.test.ts

# Edge function tests
npx vitest run supabase/functions/__tests__
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:ui
```

## Test Coverage Goals

The test suite aims for:
- **90%+ code coverage** for core notification functionality
- **100% coverage** for critical paths (permission handling, subscription management)
- **Cross-browser compatibility** verification
- **Performance benchmarks** for key operations
- **Error handling** validation for all failure scenarios

## Key Test Scenarios

### Permission Management
- ✅ Permission request flow
- ✅ Permission denied handling
- ✅ Unsupported browser detection
- ✅ Permission state changes

### Subscription Lifecycle
- ✅ Subscription creation and storage
- ✅ Subscription updates and renewal
- ✅ Subscription expiry handling
- ✅ Unsubscription process

### Notification Delivery
- ✅ Push notification sending
- ✅ Notification display and interaction
- ✅ Offline notification queuing
- ✅ Background sync processing

### User Preferences
- ✅ Preference management UI
- ✅ Quiet hours enforcement
- ✅ Notification type filtering
- ✅ Real-time preference updates

### Error Handling
- ✅ Network failure recovery
- ✅ Service worker errors
- ✅ Push service failures
- ✅ Database operation errors

### Performance
- ✅ Notification delivery speed
- ✅ Memory usage optimization
- ✅ Concurrent operation handling
- ✅ Large dataset processing

## Browser Support Matrix

| Browser | Version | Push Notifications | Service Worker | PWA |
|---------|---------|-------------------|----------------|-----|
| Chrome | 88+ | ✅ | ✅ | ✅ |
| Firefox | 85+ | ✅ | ✅ | ✅ |
| Safari | 16+ | ✅ | ✅ | ✅ |
| Edge | 88+ | ✅ | ✅ | ✅ |
| iOS Safari | 16.4+ | ⚠️ Limited | ✅ | ✅ |
| Chrome Mobile | 88+ | ✅ | ✅ | ✅ |

## Continuous Integration

Tests are configured to run on:
- Pull request creation
- Main branch commits
- Scheduled daily runs
- Manual triggers

### CI Test Matrix
- Node.js versions: 18, 20
- Operating systems: Ubuntu, Windows, macOS
- Browser environments: Headless Chrome, Firefox

## Troubleshooting

### Common Issues

1. **Service Worker Import Errors**
   - Ensure service worker files are in the correct location
   - Check import paths in test files

2. **Mock Setup Issues**
   - Verify global mocks are properly configured in setup.ts
   - Check that browser APIs are mocked before tests run

3. **Async Test Failures**
   - Use proper async/await patterns
   - Ensure all promises are properly awaited

4. **Environment Variable Issues**
   - Check that test environment variables are set
   - Verify VAPID keys are configured for tests

### Debug Mode
```bash
# Run tests with debug output
DEBUG=1 npx vitest run

# Run specific test with verbose output
npx vitest run --reporter=verbose src/path/to/test.ts
```

## Contributing

When adding new notification features:

1. **Write tests first** (TDD approach)
2. **Include all test categories** (unit, integration, performance)
3. **Test error scenarios** and edge cases
4. **Update browser compatibility** tests if needed
5. **Verify performance impact** with performance tests
6. **Document new test scenarios** in this README

## Performance Benchmarks

Current performance targets:
- Notification Manager initialization: < 100ms
- Push subscription creation: < 500ms
- Notification history fetch (50 items): < 100ms
- Preference updates: < 200ms
- Service worker push event handling: < 50ms
- Notification click handling: < 100ms

These benchmarks are validated in the performance test suite.