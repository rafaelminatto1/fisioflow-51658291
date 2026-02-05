import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';
// import { firebase } from '@genkit-ai/firebase';

// Initialize Genkit
export const ai = genkit({
  plugins: [
    vertexAI({ location: 'us-central1' }),
    // firebase(),
  ],
});
