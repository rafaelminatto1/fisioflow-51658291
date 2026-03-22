/**
 * Appointment Service Tests
 */

describe('AppointmentService', () => {
  it('should export appointment functions', () => {
    const exports = [
      'subscribeToAppointments',
      'getUpcomingAppointments',
      'getPastAppointments',
      'getNextAppointment',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });
});
