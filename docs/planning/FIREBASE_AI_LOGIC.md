# Firebase AI Logic Integration

## Overview

This implementation integrates Firebase AI Logic into FisioFlow using three approaches:

1. **Client-Side SDK** - Direct model access from frontend for non-clinical features
2. **Modernized Genkit Flows** - Updated AI flows using `ai.defineFlow()` patterns
3. **Enhanced Monitoring** - Built-in observability through Genkit Dev UI

## Architecture

### Client-Side SDK (`src/lib/firebase-ai.ts`)

Direct client-to-model communication for non-sensitive AI features:

```typescript
import { generateQuickSuggestion, expandExerciseDescription } from '@/lib/firebase-ai';

// Quick text suggestions
const suggestion = await generateQuickSuggestion('Dicas de alongamento');

// Exercise descriptions
const details = await expandExerciseDescription('Agachamento');
```

**Use Cases:**
- Exercise descriptions
- Wellness tips
- Text formatting
- Autocomplete suggestions
- Non-clinical chat

**Security:** PHI/clinical data remains server-side via Cloud Functions.

### Genkit Flows (`functions/src/ai/flows/`)

Modernized AI flows with proper schemas and type safety:

#### Clinical Analysis Flow
```typescript
import { comprehensiveClinicalFlow } from './ai/flows';

const result = await comprehensiveClinicalFlow({
  patientId: 'patient-123',
  currentSOAP: { subjective: '...', objective: {...} },
  useGrounding: true,
});
```

#### Exercise Suggestion Flow
```typescript
import { exerciseSuggestionFlow } from './ai/flows';

const program = await exerciseSuggestionFlow({
  patientId: 'patient-123',
  goals: ['Reduzir dor lombar', 'Melhorar mobilidade'],
  treatmentPhase: 'progressive',
  painMap: { 'lower_back': 6 },
});
```

#### SOAP Generation Flow
```typescript
import { soapGenerationFlow } from './ai/flows';

const soapNote = await soapGenerationFlow({
  patientContext: {
    patientName: 'João Silva',
    condition: 'Lombalgia',
    sessionNumber: 5,
  },
  subjective: 'Paciente relata...',
  assistantNeeded: 'both', // assessment + plan
});
```

## File Structure

```
functions/src/ai/
├── config.ts                    # Genkit configuration
├── flows/
│   ├── index.ts                 # Central exports
│   ├── clinicalAnalysis.ts      # Clinical analysis flows
│   ├── soapGeneration.ts        # SOAP note flows
│   ├── exerciseSuggestion.ts    # Exercise recommendation flows
│   └── exerciseGenerator.ts     # Exercise plan generation (existing)
├── flow-wrappers.ts             # Compatibility wrappers
└── [legacy handlers...]         # Old handlers (can be deprecated)

src/lib/
└── firebase-ai.ts               # Client-side SDK
```

## Development Workflow

### Testing Flows Locally

1. Start the Genkit Dev UI:
```bash
cd functions
genkit start -- npm run serve
```

2. Open http://localhost:4000 to access the Developer UI

3. Test flows interactively with sample inputs

### Running Functions Emulator

```bash
firebase emulators:start --only functions
```

## Migration Guide

### From Old Handlers to Genkit Flows

**Before (Old Pattern):**
```typescript
// functions/src/ai/clinical-analysis.ts
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({ project: process.env.GCLOUD_PROJECT });
const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
const result = await model.generateContent(prompt);
```

**After (Genkit Pattern):**
```typescript
// functions/src/ai/flows/clinicalAnalysis.ts
import { gemini15Pro } from '@genkit-ai/vertexai';
import { ai } from '../config';

export const clinicalAnalysisFlow = ai.defineFlow(
  {
    name: 'clinicalAnalysis',
    inputSchema: ClinicalAnalysisInputSchema,
    outputSchema: ClinicalAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: gemini15Pro,
      prompt: buildPrompt(input),
      output: { format: 'json', schema: ClinicalAnalysisOutputSchema },
    });
    return output;
  }
);
```

**Benefits:**
- ✅ Type-safe inputs/outputs with Zod schemas
- ✅ Built-in tracing and observability
- ✅ Easier testing via Genkit Dev UI
- ✅ Consistent model references
- ✅ Better error handling

## API Compatibility

All existing Cloud Function endpoints remain unchanged:

- `aiClinicalAnalysis` - Now uses `comprehensiveClinicalFlow`
- `aiExerciseSuggestion` - Now uses `exerciseSuggestionFlow`
- `aiSoapGeneration` - Now uses `soapGenerationFlow`
- `generateExercisePlan` - Already using Genkit

Wrappers in `flow-wrappers.ts` maintain backward compatibility.

## Model Selection

| Use Case | Model | Rationale |
|----------|-------|-----------|
| Clinical Analysis | `gemini15Pro` | Best reasoning for complex decisions |
| Red Flag Checks | `gemini15Flash` | Fast, cost-effective screening |
| Exercise Suggestions | `gemini15Flash` | Structured output, moderate complexity |
| SOAP Notes | `gemini15Flash` | Quick generation with good quality |
| Chat/Autocomplete | `gemini15Flash` | Low latency, high throughput |

## Security Considerations

### Client-Side SDK
- ✅ API keys secured via Firebase AI Logic proxy
- ✅ App Check integration for abuse prevention
- ✅ Only non-PHI features exposed to client
- ✅ Rate limiting via Firebase quotas

### Server-Side Flows
- ✅ Clinical data stays server-side
- ✅ Existing rate limiting preserved
- ✅ Usage tracking maintained
- ✅ HIPAA compliance patterns unchanged

## Monitoring

### Genkit Dev UI
- View all flow executions
- Inspect inputs/outputs
- Trace model calls
- Debug errors

### Firebase Console
- Model usage metrics
- Cost tracking
- Error rates
- Latency monitoring

## Next Steps

1. **Enable Firebase AI Logic** in Firebase Console
2. **Configure App Check** for abuse protection
3. **Test flows** using Genkit Dev UI
4. **Monitor usage** via Firebase Console
5. **Deprecate old handlers** after migration validation

## Resources

- [Firebase AI Logic Docs](https://firebase.google.com/docs/ai-logic)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)
- [Implementation Plan](/.gemini/antigravity/brain/8714660a-fc17-4710-8003-a573b017aaa3/implementation_plan.md)
