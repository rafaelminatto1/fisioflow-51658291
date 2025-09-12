import { describe, it, expect } from 'vitest';

describe('PaymentService Minimal Test', () => {
  it('should import the module', async () => {
    try {
      const module = await import('../PaymentService');
      console.log('Module keys:', Object.keys(module));
      console.log('PaymentService type:', typeof module.PaymentService);
      expect(true).toBe(true); // Just pass for now
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  });
});