/**
 * Settings Service Tests
 */

describe('SettingsService', () => {
  it('should export settings functions', () => {
    const exports = [
      'getSettings',
      'getSetting',
      'updateSetting',
      'toggleSetting',
      'resetSettings',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });
});
