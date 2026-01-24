import { executeGQL } from '../lib/dataConnect';
import { Exercise } from '../types/schema';

export const ExerciseService = {
  async getAll(): Promise<Exercise[]> {
    const query = `
      query ListExercises {
        exercises {
          id
          name
          category
          muscle_group
          video_url
        }
      }
    `;
    const data = await executeGQL(query);
    return data.exercises;
  },

  async search(text: string): Promise<Exercise[]> {
    const query = `
      query SearchExercises($text: String!) {
        searchSimilarExercises(query: $text) {
          exercise {
            id
            name
            category
            muscle_group
          }
          similarity
        }
      }
    `;
    const data = await executeGQL(query, { text });
    return data.searchSimilarExercises.map((r: any) => r.exercise);
  }
};