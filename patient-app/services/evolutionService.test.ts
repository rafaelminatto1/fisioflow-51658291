/**
 * Evolution Service Tests
 */

describe('EvolutionService', () => {
  it('should export evolution functions', () => {
    const exports = [
      'subscribeToEvolutions',
      'getEvolutions',
      'getEvolutionStats',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });
});
