import { describe, it, expect } from 'vitest';

describe('PaymentService Basic Tests', () => {
  it('should be able to import PaymentService', async () => {
    const module = await import('../PaymentService');
    expect(module.PaymentService).toBeDefined();
    expect(typeof module.PaymentService).toBe('object');
  });

  it('should have required static methods', async () => {
    const { PaymentService } = await import('../PaymentService');
    
    expect(typeof PaymentService.createPayment).toBe('function');
    expect(typeof PaymentService.getAppointmentPayments).toBe('function');
    expect(typeof PaymentService.getPatientSessionPackages).toBe('function');
    expect(typeof PaymentService.useSessionFromPackage).toBe('function');
    expect(typeof PaymentService.getPatientFinancialSummary).toBe('function');
    expect(typeof PaymentService.markAppointmentAsPaid).toBe('function');
    expect(typeof PaymentService.getPaymentStats).toBe('function');
    expect(typeof PaymentService.calculateRemainingSessionsForPatient).toBe('function');
  });
});