# Virtualized Components

This directory contains virtualized versions of schedule components for improved performance with large datasets.

## VirtualizedAppointmentList

A virtualized list component that renders only visible appointment cards, improving performance when displaying 50+ appointments.

### Features

- **Automatic Virtualization**: Only applies virtualization when appointment count exceeds 50
- **Overscan Buffer**: Renders extra items above/below viewport to prevent blank spaces during scrolling
- **Configurable**: Customizable item height and overscan count
- **Performance**: Maintains 60fps scrolling even with 100+ appointments

### Usage

```tsx
import { VirtualizedAppointmentList } from '@/components/schedule/virtualized/VirtualizedAppointmentList';

function MyScheduleView() {
  const appointments = useAppointments(); // Your appointments data
  
  return (
    <VirtualizedAppointmentList
      appointments={appointments}
      onAppointmentClick={(apt) => console.log('Clicked:', apt)}
      itemHeight={200} // Optional: default is 200px
      overscan={3}     // Optional: default is 3 items
      className="h-full" // Optional: custom styling
    />
  );
}
```

### Integration with AppointmentListView

To integrate virtualization into the existing `AppointmentListView`, you can replace the appointment rendering section:

```tsx
// Before (non-virtualized)
{groupedAppointments.morning.map(apt => (
  <SwipeableAppointmentCard
    key={apt.id}
    appointment={apt}
    onClick={handleAppointmentClickWrapper}
  />
))}

// After (virtualized for large lists)
{groupedAppointments.morning.length > 50 ? (
  <VirtualizedAppointmentList
    appointments={groupedAppointments.morning}
    onAppointmentClick={handleAppointmentClickWrapper}
  />
) : (
  groupedAppointments.morning.map(apt => (
    <SwipeableAppointmentCard
      key={apt.id}
      appointment={apt}
      onClick={handleAppointmentClickWrapper}
    />
  ))
)}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appointments` | `Appointment[]` | Required | Array of appointments to display |
| `onAppointmentClick` | `(appointment: Appointment) => void` | Required | Callback when an appointment is clicked |
| `itemHeight` | `number` | `200` | Height of each appointment card in pixels |
| `overscan` | `number` | `3` | Number of items to render outside viewport |
| `className` | `string` | `''` | Additional CSS classes |

### Performance Characteristics

- **Small lists (< 50 items)**: No virtualization overhead, renders all items normally
- **Large lists (≥ 50 items)**: Only renders visible items + overscan buffer
- **Scroll performance**: Maintains 60fps with 100+ appointments
- **Memory usage**: Reduces DOM nodes from N to ~10-20 visible items

### Validates

- **Requirement 2.3**: Virtualized appointment list rendering
