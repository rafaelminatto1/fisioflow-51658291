import { describe, it, expect } from 'vitest';

describe('Debug Export Test', () => {
  it('should import test service', async () => {
    const module = await import('../../debug-export');
    console.log('Module keys:', Object.keys(module));
    expect(module.TestService).toBeDefined();
  });
});