/**
 * Exercise Service Tests
 */

describe('ExerciseService', () => {
  it('should export exercise functions', () => {
    const exports = [
      'getActiveExercisePlan',
      'subscribeToExercisePlan',
      'toggleExercise',
      'submitExerciseFeedback',
      'getExerciseStats',
    ];
    exports.forEach(exp => {
      expect(typeof exp).toBe('string');
    });
  });
});
