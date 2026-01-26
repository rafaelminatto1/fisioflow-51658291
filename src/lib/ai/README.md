# FisioFlow AI Clinical Assistants - FASE 2

**IA Clínica Assistiva para Fisioterapia** powered by Firebase AI Logic (Google Gemini).

## Overview

This module provides production-ready AI clinical assistants for physical therapy practice in Brazil. It leverages Google Gemini models through Firebase AI Logic SDK for cost-effective, accurate clinical decision support.

### Features

1. **Exercise AI Assistant** - Smart exercise recommendations based on patient profile, SOAP notes, and pain maps
2. **SOAP Note Assistant** - Voice transcription and structured SOAP note generation
3. **Clinical Decision Support** - Evidence-based recommendations with red flag identification

## Installation

The module is already integrated into FisioFlow. Ensure environment variables are configured:

```bash
# .env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

## Quick Start

### Exercise Suggestions

```typescript
import { createExerciseAIAssistant, buildPatientContext } from '@/lib/ai/exercises';

// Create assistant instance
const assistant = createExerciseAIAssistant();

// Build patient context
const context = await buildPatientContext(
  patient,
  soapHistory,
  {
    goals: ['Reduzir dor lombar', 'Melhorar mobilidade'],
    painMap: { 'lombar': 7, 'quadril direito': 5 },
  }
);

// Get recommendations
const response = await assistant.suggestExercises(context);

if (response.success) {
  console.log('Recommended exercises:', response.data.exercises);
  console.log('Program rationale:', response.data.programRationale);
}
```

### SOAP Note Generation

```typescript
import { createSOAPAssistant, buildPatientSOAPContext } from '@/lib/ai/soap-assistant';

const assistant = createSOAPAssistant();

// From text
const soap = await assistant.generateSOAPFromText(
  consultationTranscript,
  buildPatientSOAPContext(patient, sessionNumber, previousSOAP)
);

// From audio
const soapFromAudio = await assistant.generateSOAPFromAudio(
  audioBuffer,
  'audio/mp3',
  buildPatientSOAPContext(patient, sessionNumber)
);
```

### Clinical Decision Support

```typescript
import { createClinicalDecisionSupport, buildPatientCaseData } from '@/lib/ai/clinical-support';

const cds = createClinicalDecisionSupport();

// Analyze case
const analysis = await cds.analyzeCase(
  buildPatientCaseData(patient, currentSOAP, previousSessions)
);

if (analysis.success) {
  // Check for red flags
  const urgentFlags = analysis.data.redFlags.filter(f => f.urgency === 'immediate');

  // Review treatment recommendations
  const evidenceBased = analysis.data.treatmentRecommendations
    .filter(r => r.evidenceLevel === 'strong');

  // Consider prognosis
  const prognosis = analysis.data.prognosis;
}
```

## React Hooks

### useAIExercises

```tsx
import { useAIExercises } from '@/hooks/ai';

function ExerciseRecommendations({ patient }) {
  const { suggestions, isLoading, generateWithLibrary } = useAIExercisesWithLibrary(
    patient.id,
    patientContext
  );

  return (
    <div>
      <button onClick={generateWithLibrary}>
        Generate AI Recommendations
      </button>

      {suggestions && (
        <div>
          <h3>Program Rationale</h3>
          <p>{suggestions.programRationale}</p>

          <h3>Recommended Exercises</h3>
          {suggestions.exercises.map(ex => (
            <ExerciseCard key={ex.exerciseId} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## API Reference

### Exercise AI Assistant

#### `ExerciseAIAssistant`

| Method | Description |
|--------|-------------|
| `suggestExercises(context)` | Generate exercise recommendations from patient context |
| `suggestExercisesFromLibrary(context, library)` | Generate and match to actual exercise IDs |

**Models Used:**
- Primary: `gemini-2.5-flash-lite` (cost-optimized)
- Temperature: 0.4
- Max Tokens: 4096

**Cost:** ~$0.025 per suggestion (5000 input + 2000 output tokens)

### SOAP Assistant

#### `SOAPAssistant`

| Method | Description |
|--------|-------------|
| `generateSOAPFromText(text, context)` | Generate SOAP from consultation transcript |
| `generateSOAPFromAudio(audio, mimeType, context)` | Transcribe and generate SOAP |
| `transcribeAudio(audio, mimeType)` | Audio-only transcription |
| `translateSOAP(soap, language)` | Translate to other languages |

**Models Used:**
- Primary: `gemini-2.5-pro` (accuracy-focused)
- Temperature: 0.3
- Max Tokens: 8192
- Audio Support: Up to 8.4 hours

**Cost:** ~$0.15 per consultation (10000 input + 2000 output tokens)

### Clinical Decision Support

#### `ClinicalDecisionSupport`

| Method | Description |
|--------|-------------|
| `analyzeCase(caseData, useGrounding?)` | Full clinical analysis with optional search grounding |
| `checkRedFlags(caseData)` | Quick red flag check only |
| `searchEvidence(query)` | Search latest evidence on specific topic |

**Models Used:**
- Primary: `gemini-2.5-pro` (clinical accuracy)
- Temperature: 0.2 (low for safety)
- Max Tokens: 8192
- Grounding: Google Search integration

**Cost:** ~$0.10-0.20 per analysis (varies with grounding)

## Type Safety

All modules include comprehensive TypeScript types:

```typescript
import type {
  // Exercise types
  PatientProfileContext,
  ExerciseRecommendation,
  ExerciseProgramRecommendation,

  // SOAP types
  PatientSOAPContext,
  SOAPSection,
  SOAPGenerationResult,
  TranscriptionResult,

  // Clinical types
  PatientCaseData,
  ClinicalRedFlag,
  ClinicalAnalysisResult,
  TreatmentRecommendation,
} from '@/lib/ai';
```

## Error Handling

All AI functions return structured response objects:

```typescript
interface Response {
  success: boolean;
  data?: T;
  error?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

Usage pattern:

```typescript
const response = await assistant.suggestExercises(context);

if (!response.success) {
  // Handle error
  console.error('AI generation failed:', response.error);
  return;
}

// Use data
const { exercises, programRationale } = response.data;

// Track usage
console.log('Tokens used:', response.usage.totalTokens);
```

## Best Practices

### 1. Caching

Use React Query for automatic caching:

```typescript
const { suggestions, isLoading } = useAIExercises(patientId, {
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### 2. Error Recovery

Always handle errors gracefully:

```typescript
try {
  const response = await assistant.suggestExercises(context);

  if (!response.success) {
    // Fallback to manual selection
    return getFallbackExercises(context.patient.condition);
  }

  return response.data;
} catch (error) {
  logger.error('AI exercise generation failed', error);
  return getFallbackExercises(context.patient.condition);
}
```

### 3. Cost Monitoring

Track token usage:

```typescript
const response = await assistant.suggestExercises(context);

// Log for cost tracking
analytics.track('ai_exercise_generation', {
  promptTokens: response.usage.promptTokens,
  completionTokens: response.usage.completionTokens,
  estimatedCost: calculateCost(response.usage),
});
```

### 4. Red Flags

Always check for urgent red flags:

```typescript
const analysis = await cds.analyzeCase(caseData);

if (analysis.success) {
  const urgentFlags = getCriticalRedFlags(analysis.data.redFlags);

  if (urgentFlags.length > 0) {
    // Alert user
    showRedFlagAlert(urgentFlags);
  }
}
```

## Architecture

```
src/lib/ai/
├── exercises.ts         # Exercise AI Assistant
├── soap-assistant.ts    # SOAP Note Assistant with voice
├── clinical-support.ts  # Clinical Decision Support
├── index.ts            # Module exports
└── README.md           # This file

src/hooks/ai/
├── useAIExercises.ts   # React hooks for exercise suggestions
└── index.ts           # Hook exports
```

## Dependencies

- `@google/generative-ai` ^0.24.1
- `zod` ^3.25.76 (schema validation)
- Firebase SDK 11.10.0+

## Roadmap

### FASE 3 (Planned)
- [ ] Video-based movement analysis
- [ ] Pain map evolution tracking with vision
- [ ] PDF/document analysis for medical records

### FASE 4 (Planned)
- [ ] Live API for real-time voice coaching
- [ ] Real-time exercise form feedback

### FASE 5 (Planned)
- [ ] Predictive analytics for recovery timelines
- [ ] Population health analytics
- [ ] Treatment optimization

## Contributing

When adding new AI features:

1. Create a new file in `src/lib/ai/`
2. Export from `index.ts`
3. Add TypeScript types
4. Include JSDoc comments
5. Add React hooks if needed
6. Update this README

## Support

For issues or questions:
- Check existing AI implementation in `src/inngest/workflows/ai-insights.ts`
- Review Firebase AI documentation: https://firebase.google.com/docs/ai-logic
- Consult the roadmap: `docs/FIREBASE_AI_ROADMAP.md`

## License

Part of FisioFlow - Internal use only.
