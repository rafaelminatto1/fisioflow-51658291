# Calendar Virtualization

## Overview

Virtualization infrastructure has been implemented for the Schedule calendar views to improve performance when rendering large numbers of time slots (>50) or appointments (>50).

## Components

### VirtualizedCalendarGrid
Located: `src/components/schedule/virtualized/VirtualizedCalendarGrid.tsx`

Renders only visible time slots for optimal performance. Automatically enables virtualization only when slot count exceeds 50.

**Features:**
- Only renders visible time slots (plus overscan buffer)
- Uses `transform: translateY()` for optimal performance  
- Maintains smooth scrolling at 60fps
- Automatic threshold detection (>50 slots)

**Usage Example:**
```typescript
<VirtualizedCalendarGrid
  timeSlots={timeSlots}
  slotHeight={80}
  containerHeight={600}
  overscan={3}
  renderSlot={(time, index) => (
    <TimeSlotComponent time={time} />
  )}
/>
```

### VirtualizedAppointmentList
Located: `src/components/schedule/virtualized/VirtualizedAppointmentList.tsx`

Renders only visible appointment cards in list views. Automatically enables virtualization only when appointment count exceeds 50.

**Features:**
- Custom virtualization for appointment cards
- Automatic threshold detection (>50 appointments)
- Smooth scrolling performance
- Preserves all appointment card functionality

**Usage Example:**
```typescript
<VirtualizedAppointmentList
  appointments={appointments}
  onAppointmentClick={handleClick}
  itemHeight={200}
  overscan={3}
/>
```

## Current Integration Status

### CalendarView (src/components/schedule/CalendarView.tsx)
- Delegates rendering to CalendarDayView, CalendarWeekView, CalendarMonthView
- These child components currently use direct rendering (`.map()`)
- **Virtualization is available but not integrated** due to:
  - Default slot counts are below 50 threshold (28 slots for weekdays)
  - Complex drag-and-drop interactions need careful integration
  - Current performance is already optimized with memoization

### When to Integrate

Virtualization should be integrated into the view components when:
1. Business hours are extended significantly (e.g., 24-hour operation = 48 slots)
2. Slot duration is reduced (e.g., 15-minute slots = 56 slots for 14-hour day)
3. Performance profiling shows rendering bottlenecks with current slot counts

## Integration Guide

To integrate VirtualizedCalendarGrid into CalendarDayView or CalendarWeekView:

1. **Wrap the time slot rendering section:**
```typescript
// Before:
{timeSlots.map((time, index) => (
  <TimeSlotComponent key={time} time={time} />
))}

// After:
<VirtualizedCalendarGrid
  timeSlots={timeSlots}
  slotHeight={slotHeightMobile}
  containerHeight={containerHeight}
  renderSlot={(time, index) => (
    <TimeSlotComponent key={time} time={time} />
  )}
/>
```

2. **Preserve drag-and-drop handlers:**
   - Ensure `onDragOver`, `onDrop`, `onDragLeave` are passed through
   - Maintain drop target state and visual feedback
   - Test thoroughly with drag-and-drop operations

3. **Test scrolling performance:**
   - Verify 60fps scrolling with >50 slots
   - Check that overscan buffer prevents blank spaces
   - Ensure current time indicator updates correctly

## Performance Thresholds

- **Time Slots**: Virtualization activates when slot count > 50
- **Appointments**: Virtualization activates when appointment count > 50
- **Overscan**: Default 3 items above/below viewport
- **Target FPS**: 60fps during scrolling

## Testing

Tests are located in:
- `src/components/schedule/virtualized/__tests__/VirtualizedCalendarGrid.test.tsx`
- `src/components/schedule/virtualized/__tests__/VirtualizedAppointmentList.test.tsx`

Run tests with:
```bash
npm run test -- virtualized
```

## Related Hooks

- `useVirtualizedTimeSlots` - Core virtualization logic for time slots
- `useCardSize` - Calculates card dimensions for proper virtualization
- `useCalendarDrag` - Drag-and-drop state management (must be preserved)

## Notes

- Virtualization is **opt-in** via the 50-slot threshold
- No performance overhead for typical calendars (<50 slots)
- All existing functionality (drag-drop, tooltips, accessibility) must be preserved
- Integration should be done incrementally with thorough testing
