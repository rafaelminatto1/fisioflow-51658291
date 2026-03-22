/**
 * Simple Example Test
 * Demonstrates that the testing infrastructure is working
 */

describe('Test Infrastructure', () => {
  it('should run basic math tests', () => {
    expect(1 + 1).toBe(2);
    expect(2 * 3).toBe(6);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  it('should handle object comparisons', () => {
    const obj = { name: 'Test', value: 123 };
    expect(obj).toEqual({ name: 'Test', value: 123 });
    expect(obj).toHaveProperty('name');
  });

  it('should handle string operations', () => {
    expect('FisioFlow'.toLowerCase()).toBe('fisioflow');
    expect('Patient App'.length).toBe(11);
  });

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
  });
});
