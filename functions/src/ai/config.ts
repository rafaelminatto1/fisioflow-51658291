// import { firebase } from '@genkit-ai/firebase';

// Initialize Genkit

import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [
    vertexAI({ location: 'us-central1' }),
    // firebase(),
  ],
});
