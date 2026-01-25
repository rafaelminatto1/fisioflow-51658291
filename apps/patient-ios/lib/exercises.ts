// Placeholder exercise functions - TODO: Integrate with Firebase

export interface Exercise {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  description?: string;
}

export const ExerciseFunctions = {
  async listExercises() {
    // TODO: Implement Firebase exercise fetching
    return {
      data: [
        { id: '1', name: 'Agachamento', category: 'lower_body', difficulty: 'beginner' },
        { id: '2', name: 'Flexão de braço', category: 'upper_body', difficulty: 'beginner' },
        { id: '3', name: 'Prancha abdominal', category: 'core', difficulty: 'intermediate' },
      ] as Exercise[],
    };
  },

  async getExercise(id: string) {
    // TODO: Implement Firebase exercise fetching
    return {
      id,
      name: 'Exemplo',
      category: 'general',
      difficulty: 'beginner',
    } as Exercise;
  },
};
