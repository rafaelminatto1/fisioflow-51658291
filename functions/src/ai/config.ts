import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    vertexAI({ location: 'us-central1' }),
  ],
});

// Export model references
export const gemini15Flash = vertexAI.model('gemini-1.5-flash');
export const gemini15Pro = vertexAI.model('gemini-1.5-pro');
