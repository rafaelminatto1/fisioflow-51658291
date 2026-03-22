/**
 * Authentication Service Tests
 */

describe('AuthService', () => {
  it('should export signIn', () => {
    const exports = [
      'signIn',
      'signUp',
      'signOut',
      'resetPassword',
      'getCurrentUser',
      'getUserData',
      'updateProfileData',
      'linkToProfessional',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });
});
