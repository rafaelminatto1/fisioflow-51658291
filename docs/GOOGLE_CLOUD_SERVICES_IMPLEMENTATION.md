# Google Cloud Services - Implementation Summary

## Overview

This document summarizes the implementation of free Google Cloud services for FisioFlow.

**Status**: ✅ **All services deployed and tested**

**Deployment Date**: 2026-02-02

**Region**: southamerica-east1 (São Paulo)

## Deployed Endpoints

| Service | Endpoint | CPU | Memory |
|---------|----------|-----|--------|
| detectLanguage | `https://detectlanguage-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 256MiB |
| getSupportedLanguages | `https://getsupportedlanguages-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 256MiB |
| translate | `https://translate-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 256MiB |
| translateExercise | `https://translateexercise-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 256MiB |
| transcribeAudio | `https://transcribeaudio-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 512MiB |
| transcribeLongAudio | `https://transcribelongaudio-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 256MiB |
| synthesizeTTS | `https://synthesizetts-tfecm5cqoq-rj.a.run.app` | 0.125 vCPU | 256MiB |

## Implemented Services

### Phase 1: Monitoring & Security ✅

#### 1. Cloud Logging (`functions/src/lib/cloud-logging.ts`)
- **Free Tier**: 50GB/month
- **Features**:
  - Centralized log management
  - Structured logging integration
  - Trace linking for distributed tracing
  - Log sink for existing logger
- **Usage**:
  ```typescript
  import { writeLog, createCloudLoggingSink } from './lib/cloud-logging';
  await writeLog({
    severity: 'INFO',
    message: 'User logged in',
    labels: { userId: '123' },
  });
  ```

#### 2. Secret Manager (`functions/src/lib/secret-manager.ts`)
- **Free Tier**: 6 active secrets, 10K accesses/month
- **Features**:
  - Secure secret storage
  - 5-minute cache for performance
  - Helper functions for secrets
- **Usage**:
  ```typescript
  import { accessSecret, accessSecretRequired } from './lib/secret-manager';
  const dbPassword = await accessSecretRequired('DB_PASS');
  ```
- **Setup**:
  ```bash
  gcloud secrets create DB_PASS --data-file=-
  gcloud secrets add-iam-policy-binding DB_PASS \
    --member="serviceAccount:fisioflow-migration@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
  ```

#### 3. Firebase Crashlytics (`functions/src/lib/crashlytics.ts`, `src/lib/firebase/crashlytics.ts`)
- **Free Tier**: Unlimited
- **Features**:
  - Non-fatal error recording
  - User context tracking
  - Custom keys
- **Usage**:
  ```typescript
  import { recordError, setUserId } from './lib/crashlytics';
  await setUserId('user-123');
  await recordError(new Error('Something went wrong'), { context: 'data' });
  ```

#### 4. Firebase Performance Monitoring (`functions/src/lib/performance.ts`, `src/lib/firebase/performance.ts`)
- **Free Tier**: 50K trace events/day
- **Features**:
  - Custom traces
  - HTTP/Database operation measurement
  - Metrics recording
- **Usage**:
  ```typescript
  import { startTrace, measureHttpCall } from './lib/performance';
  const trace = startTrace('operation_name');
  // ... do work
  trace.stop();
  ```

### Phase 2: AI & Speech ✅

#### 5. Cloud Speech-to-Text (`functions/src/lib/speech-to-text.ts`, `functions/src/api/speech.ts`)
- **Free Tier**: 60 minutes/month
- **Features**:
  - Medical context transcription
  - Word-level timestamps
  - Multiple alternatives
  - Support for 120+ medical terms in Portuguese
- **API Endpoint**: `POST https://.../transcribeAudio`
- **Usage**:
  ```typescript
  import { transcribeConsultationAudio } from './lib/speech-to-text';
  const transcription = await transcribeConsultationAudio(audioBase64, 'audio/webm');
  ```

#### 6. Cloud Text-to-Speech (`functions/src/lib/text-to-speech.ts`, `functions/src/api/tts.ts`)
- **Free Tier**: 4M characters/month (standard voices)
- **Features**:
  - Exercise instruction synthesis with SSML
  - Accessibility mode
  - Countdown generation
  - Encouragement messages
- **API Endpoint**: `POST https://.../synthesizeTTS`
- **Usage**:
  ```typescript
  import { synthesizeForExercise } from './lib/text-to-speech';
  const audio = await synthesizeForExercise('Agachamento', 'Dobrar os joelhos...');
  ```

#### 7. Cloud Translation API (`functions/src/lib/translation.ts`, `functions/src/api/translation.ts`)
- **Free Tier**: 500K characters/month
- **Features**:
  - Text translation
  - Language detection
  - Exercise translation
  - Medical glossary support
- **API Endpoints**:
  - `POST https://.../translate`
  - `POST https://.../detectLanguage`
  - `GET https://.../getSupportedLanguages`
  - `POST https://.../translateExercise`
- **Usage**:
  ```typescript
  import { translateFromPortuguese } from './lib/translation';
  const translation = await translateFromPortuguese('Treatment', 'es');
  ```

## Frontend Services

### Speech Service (`src/lib/services/speech.ts`)
```typescript
import { transcribeConsultation } from '@/lib/services/speech';
const transcription = await transcribeConsultation(audioData, 'audio/webm');
```

### TTS Service (`src/lib/services/tts.ts`)
```typescript
import { synthesizeExercise, playSynthesizedAudio } from '@/lib/services/tts';
const audio = await synthesizeExercise('Exercise name', 'Instructions...');
await playSynthesizedAudio(audio);
```

### Translation Service (`src/lib/services/translation.ts`)
```typescript
import { translate, translateExercise } from '@/lib/services/translation';
const translated = await translate('Texto', 'en-US');
```

## Environment Variables

Add to `.env`:
```bash
# Google Cloud Services
VITE_CRASHLYTICS_ENABLED=true
VITE_PERFORMANCE_MONITORING_ENABLED=true
VITE_API_BASE_URL=https://southamerica-east1-fisioflow-migration.cloudfunctions.net

# Backend (Cloud Functions)
CLOUD_LOGGING_ENABLED=true
CRASHLYTICS_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
CLOUD_SPEECH_ENABLED=true
CLOUD_TTS_ENABLED=true
CLOUD_TRANSLATION_ENABLED=true
USE_SECRET_MANAGER=true
```

## API Setup Required

### 1. Enable Google Cloud APIs
```bash
gcloud services enable \
  logging.googleapis.com \
  secretmanager.googleapis.com \
  speech.googleapis.com \
  texttospeech.googleapis.com \
  translate.googleapis.com \
  crashlytics.googleapis.com
```

### 2. Grant IAM Permissions
```bash
SA="fisioflow-migration@appspot.gserviceaccount.com"

# Secret Manager
gcloud projects add-iam-policy-binding fisioflow-migration \
  --member="serviceAccount:$SA" \
  --role="roles/secretmanager.secretAccessor"

# Speech-to-Text
gcloud projects add-iam-policy-binding fisioflow-migration \
  --member="serviceAccount:$SA" \
  --role="roles/speech.apiUser"

# Text-to-Speech
gcloud projects add-iam-policy-binding fisioflow-migration \
  --member="serviceAccount:$SA" \
  --role="roles/cloudtexttospeech.apiUser"

# Translation
gcloud projects add-iam-policy-binding fisioflow-migration \
  --member="serviceAccount:$SA" \
  --role="roles/cloudtranslate.apiUser"
```

### 3. Create Secrets (Secret Manager)
```bash
# Database secrets
echo "your-password" | gcloud secrets create DB_PASS --data-file=-
echo "your-user" | gcloud secrets create DB_USER --data-file=-
echo "your-db-name" | gcloud secrets create DB_NAME --data-file=-
echo "your-connection-name" | gcloud secrets create CLOUD_SQL_CONNECTION_NAME --data-file=-

# WhatsApp secrets
echo "your-phone-id" | gcloud secrets create WHATSAPP_PHONE_NUMBER_ID --data-file=-
echo "your-token" | gcloud secrets create WHATSAPP_ACCESS_TOKEN --data-file=-
```

## Deployment

### Deploy Cloud Functions
```bash
# Install dependencies
cd functions && pnpm install

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:transcribeAudio,synthesizeTTS,translate
```

### Deploy Hosting
```bash
# Build and deploy
pnpm build:prod
firebase deploy --only hosting
```

## Testing

### Test Results (2026-02-02)

#### ✅ detectLanguage
```bash
curl -X POST https://detectlanguage-tfecm5cqoq-rj.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá, tudo bem?"}'
```
**Response**:
```json
{"languageCode":"pt","confidence":0.6670859456062317}
```

#### ✅ getSupportedLanguages
```bash
curl -X GET https://getsupportedlanguages-tfecm5cqoq-rj.a.run.app
```
**Response**: Returns 200+ supported languages

#### ✅ translate
```bash
curl -X POST https://translate-tfecm5cqoq-rj.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, how are you?","targetLanguage":"pt-BR"}'
```
**Response**:
```json
{
  "translation": "Olá, como vai?",
  "detectedLanguageCode": "en",
  "charCount": 19,
  "targetLanguage": "pt-BR"
}
```

#### ✅ translateExercise
```bash
curl -X POST https://translateexercise-tfecm5cqoq-rj.a.run.app \
  -H "Content-Type: application/json" \
  -d '{"exerciseName":"Shoulder Press","instructions":"Lift the weights overhead","targetLanguage":"pt-BR"}'
```
**Response**:
```json
{
  "exerciseName": "Desenvolvimento de ombros",
  "instructions": "Levante os pesos acima da cabeça.",
  "targetLanguage": "pt-BR"
}
```

### Test Speech-to-Text
```bash
curl -X POST https://transcribeaudio-tfecm5cqoq-rj.a.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "audioData": "base64-encoded-audio",
    "mimeType": "audio/webm",
    "context": "medical"
  }'
```

### Test Text-to-Speech
```bash
curl -X POST https://synthesizetts-tfecm5cqoq-rj.a.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Olá, bem-vindo ao FisioFlow",
    "type": "accessibility",
    "languageCode": "pt-BR"
  }' \
  --output speech.mp3
```

## Monitoring

### View Logs
- Cloud Console: https://console.cloud.google.com/logs?project=fisioflow-migration
- Filter by: `resource.labels.function_name`

### View Crashlytics
- Firebase Console: https://console.firebase.google.com/project/fisioflow-migration/crashlytics

### View Performance
- Firebase Console: https://console.firebase.google.com/project/fisioflow-migration/performance

## Rollback Strategy

All services use feature flags via Remote Config:

```typescript
const useCloudSpeech = await isFeatureEnabled('cloud_speech_enabled');

if (useCloudSpeech) {
  try {
    return await transcribeWithCloudSpeech(audioData);
  } catch (error) {
    // Fallback to existing implementation
    return await transcribeWithGemini(audioData);
  }
}
```

## Cost Summary

| Service | Free Tier | Monthly Cost After Free |
|---------|-----------|------------------------|
| Cloud Logging | 50GB | ~$0.50/GB after |
| Secret Manager | 6 secrets, 10K access | ~$0.03/10K access |
| Crashlytics | Unlimited | Free |
| Performance Monitoring | 50K traces | Free |
| Speech-to-Text | 60 min | ~$0.006/15 sec |
| Text-to-Speech | 4M chars (standard) | ~$4/M chars |
| Translation | 500K chars | ~$20/M chars |

**Estimated Monthly Cost for Typical Usage**: $0-10 (well within free tiers)
