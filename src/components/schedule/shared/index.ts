/**
 * Shared Appointment Components
 *
 * @description
 * Common components, utilities, and configurations shared across
 * all appointment card implementations (schedule, calendar, mobile).
 *
 * @module components/schedule/shared
 */

// Status configuration
export {
  getStatusConfig,
  getStatusColor,
  APPOINTMENT_STATUS_CONFIG,
  type AppointmentStatusConfig,
} from './appointment-status';

// Utilities
export {
  getInitials,
  normalizeTime,
  calculateEndTime,
  formatDuration,
  isPastAppointment,
  isToday,
  formatAppointmentType,
} from './utils';
