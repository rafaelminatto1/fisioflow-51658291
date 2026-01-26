# FisioFlow x Firebase AI Logic - Planejamento Estratégico 2026

> **Status do Projeto**: Migração Híbrida Firebase/Supabase em andamento
> **Data**: Janeiro 2026
> **Objetivo**: Implementar recursos de IA do Firebase para transformar o FisioFlow na plataforma mais avançada de fisioterapia do Brasil

---

## Sumário Executivo

O FisioFlow é uma plataforma completa de gestão para clínicas de fisioterapia no Brasil, com:
- 500+ exercícios com vídeos demonstrativos
- 21+ formulários de avaliação validados
- Telemedicina com gravação de consultas
- Apps iOS nativos para pacientes e profissionais
- Análise de dor gamificada com mapas interativos
- AI já integrada (OpenAI, Google AI)

**Oportunidade Firebase**: AI Logic permite agregar capacidades multimodais avançadas (vídeo, áudio, imagem, texto) diretamente nos apps móveis e web, com segurança nativa (App Check) e configuração remota (Remote Config).

---

## Recursos Firebase AI Logic Disponíveis

### Modelos Suportados (Janeiro 2026)

| Modelo | Casos de Uso | Input | Output |
|--------|--------------|-------|--------|
| **Gemini 3 Pro** (preview) | Análises clínicas complexas | 1M tokens, 900 PDFs, 1000 imagens | 65K tokens |
| **Gemini 2.5 Pro** | Geral - equilíbrio custo/performance | 1M tokens, 3000 PDFs | 65K tokens |
| **Gemini 2.5 Flash** | Respostas rápidas | 1M tokens | 65K tokens |
| **Gemini 2.5 Flash-Lite** | Baixo custo, alta performance | 1M tokens | 65K tokens |
| **Imagen 4** | Geração de imagens clínicas | 480 tokens texto | 4 imagens |
| **Gemini 2.5 Flash Live** | Audio bidirecional em tempo real | 32K tokens | 64K tokens audio streaming |

### Capacidades Multimodais

```typescript
// Exemplo: Análise completa de paciente
const analysis = await model.generateContent([
  {
    text: "Analise este paciente baseado em:",
  },
  { text: "SOAP: " + soapRecord },
  { image: painMap },           // Mapa de dor
  { video: exerciseVideo },     // Vídeo do exercício (até 60min)
  { audio: consultationAudio }, // Áudio da consulta (até 8.4 horas)
  { pdf: examResults }          // PDFs com exames (até 3000 arquivos)
]);
```

### Recursos Avançados

- **Function Calling**: Integração com APIs externas (Google Calendar, WhatsApp, Stripe)
- **Grounding (Google Search)**: Respostas baseadas em evidências atualizadas
- **Thinking Mode**: Modelos que "pensam" antes de responder
- **Structured Output**: JSON garantido para integrações
- **App Check**: Proteção contra abuso de API
- **Remote Config**: Trocar modelos/configurações sem deploy

---

## Roadmap de Implementação

### FASE 1: Fundamentos AI (2-3 semanas)
**Prioridade**: CRÍTICA | **Risco**: Baixo | **Impacto**: Alto

#### 1.1 Configurar Firebase AI Logic Infraestrutura

```bash
# Instalar SDKs
npm install firebase/app firebase/ai
# iOS
pod install FirebaseAI
# Android
implementation platform('com.google.firebase:firebase-ai:xx.xx.xx')
```

**Tarefas**:
- [ ] Configurar projeto Firebase para AI Logic
- [ ] Escolher provedor: Gemini Developer API (free tier) ou Vertex AI
- [ ] Implementar App Check para proteção
- [ ] Configurar Remote Config para troca de modelos

**Arquivos**:
- `packages/shared-api/src/firebase/ai/config.ts`
- `packages/shared-api/src/firebase/ai/models.ts`

#### 1.2 Implementar Sistema de Prompts Centralizados

**Objetivo**: Gerenciar prompts via Remote Config para atualizar sem deploy

```typescript
// src/lib/ai/prompts/clinical-prompts.ts
export const CLINICAL_PROMPTS = {
  exercise_suggestion: {
    system: "Você é um fisioterapeuta especialista em prescrição de exercícios...",
    template: "Based on patient: {patient_profile}, SOAP: {soap_note}, suggest 5 exercises...",
    remoteConfigKey: "ai_prompt_exercise_suggestion"
  },
  soap_assistant: {
    system: "Assistente para documentação clínica em formato SOAP...",
    template: "Generate SOAP note from: {consultation_transcript}...",
    remoteConfigKey: "ai_prompt_soap_assistant"
  }
};
```

**Benefícios**:
- Atualizar prompts sem deploy
- A/B testing de prompts
- Versionamento de prompts

#### 1.3 Implementar Tracking de Custos e Rate Limiting

**Objetivo**: Monitorar uso e prevenir surpresas na fatura

```typescript
// src/lib/ai/usage-monitor.ts
export class AIUsageMonitor {
  async trackRequest(model: string, inputTokens: number, outputTokens: number) {
    await firestore.collection('ai_usage').add({
      model,
      inputTokens,
      outputTokens,
      estimatedCost: this.calculateCost(model, inputTokens, outputTokens),
      timestamp: FieldValue.serverTimestamp(),
      userId: auth.currentUser?.uid
    });
  }

  // Rate limiting por usuário
  async checkUserLimit(userId: string): Promise<boolean> {
    const usage = await this.getUserDailyUsage(userId);
    return usage < USER_DAILY_LIMIT;
  }
}
```

**Métricas**:
- Tokens por usuário/dia
- Custo por feature
- Picos de uso

---

### FASE 2: IA Clínica Assistiva (3-4 semanas)
**Prioridade**: ALTA | **Risco**: Médio | **Impacto**: Muito Alto

#### 2.1 Exercise AI Assistant (Melhoria do existente)

**Atualmente**: `src/inngest/workflows/ai-insights.ts` já usa OpenAI

**Melhorias com Firebase AI**:

```typescript
// packages/shared-api/src/ai/exercises.ts
export class ExerciseAIAssistant {
  async suggestExercises(params: {
    patientProfile: PatientProfile;
    soapNote: SOAPNote;
    painMap: PainMapData;
    patientGoals: string[];
    availableEquipment: string[];
  }) {
    const model = getGenerativeModel('gemini-2.5-flash');

    const prompt = `
      Patient: ${JSON.stringify(params.patientProfile)}
      SOAP: ${JSON.stringify(params.soapNote)}
      Pain Map: ${JSON.stringify(params.painMap)}
      Goals: ${params.patientGoals.join(', ')}

      Suggest 5 exercises from our library (500+ exercises) that:
      1. Address the pain areas indicated
      2. Match patient's condition and limitations
      3. Help achieve stated goals
      4. Use available equipment

      Return structured JSON with exercise IDs and rationale.
    `;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }

  async generateProgressReport(patientId: string, sessions: Session[]) {
    // Analisa evolução com múltiplas sessões
    // Gera gráficos e insights
  }
}
```

**Integrações**:
- [ ] `src/hooks/useExercises.ts` - adicionar sugestões AI
- [ ] `apps/patient-ios/app/(tabs)/exercises.tsx` - mostrar exercícios recomendados
- [ ] `src/pages/Profile.tsx` - relatórios de progresso

#### 2.2 SOAP Note Assistant com Voz

**Capacidade**: Transcrever consulta + gerar SOAP estruturado

```typescript
// packages/shared-api/src/ai/soap-assistant.ts
export class SOAPAssistant {
  async generateFromConsultation(audio: Blob, patientContext: PatientContext) {
    const model = getGenerativeModel('gemini-2.5-pro');

    // Transcrição + geração em uma única chamada
    const result = await model.generateContent([
      {
        audio: audio // Até 8.4 horas de áudio
      },
      {
        text: `
          Patient: ${JSON.stringify(patientContext)}

          Transcribe this consultation and generate a structured SOAP note (Subjective, Objective, Assessment, Plan).
          Return ONLY valid JSON.
        `
      }
    ]);

    return {
      transcription: result.response.text,
      soap: JSON.parse(result.response.text)
    };
  }

  async translateSOAP(soapNote: SOAPNote, targetLang: 'pt' | 'en' | 'es') {
    // Para clínicas internacionais
  }
}
```

**UI Component**:
```tsx
// src/components/clinical/SOAPAssistant.tsx
export function SOAPAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [soap, setSoap] = useState<SOAPNote | null>(null);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    const result = await soapAssistant.generateFromConsultation(
      audioBlob,
      patientContext
    );
    setTranscript(result.transcription);
    setSoap(result.soap);
  };

  return (
    <div className="soap-assistant">
      <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      {transcript && <TranscriptDisplay text={transcript} />}
      {soap && <SOAPEditor initialData={soap} />}
    </div>
  );
}
```

#### 2.3 Clinical Decision Support

```typescript
// packages/shared-api/src/ai/clinical-support.ts
export class ClinicalDecisionSupport {
  async analyzeCase(patientData: PatientCase) {
    const model = getGenerativeModel('gemini-2.5-pro', {
      systemInstruction: `
        You are a clinical decision support system for physiotherapy.
        Provide evidence-based recommendations but always recommend
        professional judgment. Flag potential red flags.
      `
    });

    // Grounding com Google Search para evidências recentes
    const result = await model.generateContent(
      new GroundingEnhancedPrompt(`
        Analyze this case: ${JSON.stringify(patientData)}

        Provide:
        1. Potential red flags (requires immediate medical attention)
        2. Evidence-based treatment approaches
        3. Prognosis indicators
        4. Recommended assessments

        Search for latest research on this condition.
      `)
    );

    return result;
  }
}
```

---

### FASE 3: Análise Multimodal de Movimento (4-6 semanas)
**Prioridade**: ALTA | **Risco**: Alto | **Impacto**: Transformacional

#### 3.1 Exercise Form Analysis com Vídeo

**Capacidade única do Firebase AI**: Processar até 60 minutos de vídeo

```typescript
// packages/shared-api/src/ai/movement-analysis.ts
export class MovementAnalyzer {
  async analyzeExerciseForm(videoUri: string, exerciseId: string) {
    const model = getGenerativeModel('gemini-2.5-pro');

    const exercise = await getExercise(exerciseId);
    const correctForm = exercise.demoVideo;

    const result = await model.generateContent([
      {
        video: { uri: videoUri, mimeType: 'video/mp4' }
      },
      {
        video: { uri: correctForm, mimeType: 'video/mp4' }
      },
      {
        text: `
          Compare the user's exercise form with the correct form.

          Exercise: ${exercise.name}
          Instructions: ${exercise.instructions}

          Analyze:
          1. Overall form quality (0-100)
          2. Specific deviations (list each)
          3. Safety concerns (flag if dangerous)
          4. Specific corrections

          Return JSON with timestamp markers for key frames.
        `
      }
    ]);

    return JSON.parse(result.response.text());
  }
}
```

**Integração iOS**:
```swift
// apps/patient-ios/lib/features/ExerciseRecorder.swift
import FirebaseAI

class ExerciseRecorder: UIViewController {
    let ai = FirebaseAI.firebaseAI(backend: .googleAI())
    let model = ai.generativeModel(modelName: "gemini-2.5-pro")

    func analyzeRecording(videoURL: URL, exercise: Exercise) async throws -> FormAnalysis {
        let videoFile = try! GenerativeModelFileType(url: videoURL)

        let prompt = """
        Analyze this \(exercise.name) exercise form.

        Compare with correct form:
        \(exercise.instructions)

        Provide feedback on form, deviations, and safety.
        Return as JSON.
        """

        let response = try await model.generateContent([
            videoFile,
            Content{text: prompt}
        ])

        return try JSONDecoder().decode(FormAnalysis.self, from: response.text)
    }
}
```

#### 3.2 Pain Map Analysis com Visão

```typescript
// packages/shared-api/src/ai/pain-analysis.ts
export class PainMapAnalyzer {
  async analyzePainPattern(painMaps: PainMap[], patientHistory: PatientHistory) {
    const model = getGenerativeModel('gemini-2.5-flash');

    // Converter pain maps para imagens
    const painMapImages = painMaps.map(map => map.toImageBuffer());

    const result = await model.generateContent([
      ...painMapImages.map(img => ({ image: img })),
      {
        text: `
          Analyze pain evolution across ${painMaps.length} assessments.

          Patient history: ${JSON.stringify(patientHistory)}

          Identify:
          1. Pain migration patterns
          2. Response to treatment
          3. Emerging problem areas
          4. Prognosis indicators

          Return structured analysis with visual annotations.
        `
      }
    ]);

    return result;
  }
}
```

#### 3.3 Document Analysis (PDFs, Exames)

```typescript
// packages/shared-api/src/ai/document-analysis.ts
export class DocumentAnalyzer {
  async analyzeMedicalDocuments(pdfUris: string[], patientContext: PatientContext) {
    const model = getGenerativeModel('gemini-2.5-pro');

    // Suporta até 3000 PDFs!
    const pdfParts = pdfUris.map(uri => ({
      fileData: { mimeType: 'application/pdf', uri }
    }));

    const result = await model.generateContent([
      ...pdfParts,
      {
        text: `
          Patient context: ${JSON.stringify(patientContext)}

          Analyze these medical documents and extract:
          1. Diagnoses
          2. Medications
          3. Contraindications for physical therapy
          4. Relevant imaging findings
          5. Physician recommendations

          Flag any items requiring attention.
        `
      }
    ]);

    return result;
  }
}
```

**UI Component**:
```tsx
// src/components/patient/DocumentUploader.tsx
export function DocumentUploader({ patientId }: { patientId: string }) {
  const [analyzing, setAnalyzing] = useState(false);

  const handleUpload = async (files: File[]) => {
    // Upload to Firebase Storage
    const uris = await Promise.all(
      files.map(file => uploadToStorage(`patients/${patientId}/docs/${file.name}`, file))
    );

    // Analyze with AI
    setAnalyzing(true);
    const analysis = await documentAnalyzer.analyzeMedicalDocuments(uris, patientContext);
    setAnalyzing(false);

    return analysis;
  };

  return (
    <div>
      <FileUploader onUpload={handleUpload} accept=".pdf" />
      {analyzing && <AnalyzingIndicator />}
    </div>
  );
}
```

---

### FASE 4: Live API - Assistente de Voz em Tempo Real (6-8 semanas)
**Prioridade**: MÉDIA | **Risco**: Alto | **Impacto**: Inovador

#### 4.1 Voice Assistant para Telemedicina

**Capacidade**: Audio bidirecional em tempo real (nova!)

```typescript
// packages/shared-api/src/ai/voice-assistant.ts
import { getLiveGenerativeModel, ResponseModality } from 'firebase/ai';

export class TelemedicineVoiceAssistant {
  private liveModel = getLiveGenerativeModel(ai, {
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO]
    }
  });

  async startSession() {
    const session = await this.liveModel.connect();

    // Configurar para fisioterapia
    await session.send({
      role: 'system',
      content: `
        You are a physiotherapy assistant for telemedicine sessions.
        - Speak clearly in Portuguese
        - Ask relevant clarifying questions
        - Never provide diagnoses (leave that to the physiotherapist)
        - Suggest exercises when appropriate
        - Document key points for the therapist
      `
    });

    return session;
  }

  async handleAudioStream(audioStream: ReadableStream<Uint8Array>) {
    const session = await this.startSession();

    // Enviar áudio do paciente
    for await (const chunk of audioStream) {
      await session.sendAudioRealtime(chunk);
    }

    // Receber resposta em áudio
    const response = session.receive();
    for await (const message of response) {
      if (message.modelTurn) {
        // Tocar áudio da resposta
        playAudio(message.audioData);
      }
    }
  }
}
```

**Implementação iOS**:
```swift
// apps/patient-ios/lib/features/VoiceAssistant.swift
import FirebaseAI

class VoiceAssistant: NSObject, ObservableObject {
    @Published var isSpeaking = false

    let liveModel = FirebaseAI.firebaseAI(backend: .googleAI())
        .liveModel(modelName: "gemini-2.5-flash-native-audio-preview-12-2025")

    func startVoiceSession() async throws {
        let session = try await liveModel.connect()

        // Start audio conversation
        try await session.startAudioConversation()
    }
}
```

**Casos de Uso**:
1. Pré-consulta: Coletar informações do paciente
2. During session: Assistant para anotações
3. Pós-consulta: Resumo e follow-up

#### 4.2 Real-time Exercise Coaching

```typescript
// packages/shared-api/src/ai/exercise-coach.ts
export class ExerciseCoach {
  async startCoachingSession(exercise: Exercise) {
    const session = await this.liveModel.connect();

    // Instruções específicas do exercício
    await session.send({
      role: 'system',
      content: `
        You are coaching: ${exercise.name}

        Instructions:
        ${exercise.instructions}

        Provide real-time verbal feedback as you observe:
        - Count reps aloud
        - Correct form issues
        - Encourage proper breathing
        - Modify if needed
      `
    });

    return session;
  }

  // Receber frames de vídeo + áudio do paciente
  async observeAndCoach(videoStream: MediaStream, audioStream: MediaStream) {
    // Combinação de vídeo + áudio em tempo real
    // Disponível em 2026 com atualizações do Live API
  }
}
```

---

### FASE 5: Analytics e ML Avançado (4-6 semanas)
**Prioridade**: MÉDIA | **Risco**: Médio | **Impacto**: Estratégico

#### 5.1 Predictive Analytics para Recuperação

```typescript
// packages/shared-api/src/ai/predictive-analytics.ts
export class RecoveryPredictor {
  async predictRecoveryTimeline(patientId: string, condition: string) {
    const model = getGenerativeModel('gemini-2.5-pro');

    // Buscar casos similares no Firestore
    const similarCases = await firestore
      .collection('patients')
      .where('condition', '==', condition)
      .where('status', '==', 'recovered')
      .limit(100)
      .get();

    const patientData = await getPatientData(patientId);

    const result = await model.generateContent(`
      Patient: ${JSON.stringify(patientData)}
      Condition: ${condition}

      Similar cases (recovered):
      ${JSON.stringify(similarCases.docs.map(d => d.data()))}

      Predict:
      1. Expected recovery time (with confidence interval)
      2. Key milestones
      3. Risk factors for delayed recovery
      4. Recommended treatment intensity

      Return JSON with predictions and reasoning.
    `);

    return JSON.parse(result.response.text());
  }
}
```

#### 5.2 Population Health Analytics

```typescript
// packages/shared-api/src/ai/population-health.ts
export class PopulationHealthAnalyzer {
  async analyzeClinicPopulation(clinicId: string) {
    const model = getGenerativeModel('gemini-2.5-flash');

    // Agregar dados anonimizados
    const populationData = await this.getPopulationData(clinicId);

    const result = await model.generateContent(`
      Analyze this clinic's patient population:

      ${JSON.stringify(populationData)}

      Provide insights on:
      1. Most common conditions
      2. Average recovery times by condition
      3. Treatment effectiveness trends
      4. Patient retention patterns
      5. Opportunities for improvement

      Generate visualizations (data structure for charts).
    `);

    return result;
  }

  async benchmarkPerformance(clinicId: string) {
    // Comparar com médias nacionais/internacionais
    // Usar grounding para dados atualizados
  }
}
```

#### 5.3 Personalized Treatment Recommendations

```typescript
// packages/shared-api/src/ai/treatment-optimizer.ts
export class TreatmentOptimizer {
  async optimizeTreatmentPlan(patientId: string, currentPlan: TreatmentPlan) {
    const model = getGenerativeModel('gemini-2.5-pro');

    // Buscar evidências recentes
    const result = await model.generateContent(
      new GoogleSearchGrounding(`
        Current plan: ${JSON.stringify(currentPlan)}

        Patient profile: ${JSON.stringify(await getPatientProfile(patientId))}

        Research:
        - Latest evidence for these treatments
        - New techniques or modalities
        - Contraindications

        Recommend optimizations with evidence levels.
      `)
    );

    return result;
  }
}
```

---

## Integrações Firebase Adicionais

### App Check - Proteção de API

```typescript
// src/lib/firebase/app-check.ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

export async function initializeAppCheck() {
  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider('reCAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });

  // Proteger chamadas AI
  return appCheck;
}
```

### Remote Config - Troca Dinâmica de Modelos

```typescript
// src/lib/firebase/remote-config.ts
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

export async function getAIModelConfig() {
  const remoteConfig = getRemoteConfig(firebaseApp);
  await fetchAndActivate(remoteConfig);

  return {
    exerciseModel: getValue(remoteConfig, 'ai_model_exercises').asString(),
    soapModel: getValue(remoteConfig, 'ai_model_soap').asString(),
    videoModel: getValue(remoteConfig, 'ai_model_video').asString(),
    maxTokens: getValue(remoteConfig, 'ai_max_tokens').asNumber(),
    enableGrounding: getValue(remoteConfig, 'ai_enable_grounding').asBoolean()
  };
}
```

**Configurações no Console Firebase**:
```
ai_model_exercises: "gemini-2.5-flash-lite" (baixo custo)
ai_model_soap: "gemini-2.5-pro" (alta precisão)
ai_model_video: "gemini-3-pro-preview" (mais capaz)
ai_max_tokens: 4096
ai_enable_grounding: true
```

---

## Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                         FisioFlow Platform                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Web App     │  │ Patient iOS  │  │ Professional │          │
│  │  (React)     │  │ (Expo/React) │  │     iOS      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┼──────────────────┘                   │
│                            │                                      │
│                 ┌──────────▼──────────┐                          │
│                 │  shared-api package │                          │
│                 │  (AI Abstractions)  │                          │
│                 └──────────┬──────────┘                          │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                  │
│         │                  │                  │                   │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐          │
│  │  Firebase   │    │  Supabase   │    │   Vercel    │          │
│  │  AI Logic   │    │  Postgres   │    │  Edge Fns   │          │
│  │             │    │  (Legacy)   │    │             │          │
│  │ • Gemini    │    │             │    │ • Inngest   │          │
│  │ • Imagen    │    │             │    │ • Analytics │          │
│  │ • Live API  │    │             │    │ • Stripe    │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Arquivos Proposta

```
packages/shared-api/src/
├── firebase/
│   ├── ai/
│   │   ├── config.ts           # Configuração AI Logic
│   │   ├── models.ts           # Instâncias de modelos
│   │   ├── prompts/            # Prompts centralizados
│   │   │   ├── clinical-prompts.ts
│   │   │   └── exercise-prompts.ts
│   │   └── usage-monitor.ts    # Tracking de custos
│   └── ...
├── ai/
│   ├── exercises.ts            # Exercise AI Assistant
│   ├── soap-assistant.ts       # SOAP Note Assistant
│   ├── clinical-support.ts     # Clinical Decision Support
│   ├── movement-analysis.ts    # Video Analysis
│   ├── pain-analysis.ts        # Pain Map Analysis
│   ├── document-analysis.ts    # PDF Analysis
│   ├── voice-assistant.ts      # Live API Voice
│   ├── exercise-coach.ts       # Real-time Coaching
│   ├── predictive-analytics.ts # Recovery Predictions
│   ├── population-health.ts    # Population Analytics
│   └── treatment-optimizer.ts  # Treatment Optimization
└── ...

src/components/
├── clinical/
│   ├── SOAPAssistant.tsx       # UI para SOAP AI
│   ├── ExerciseAI.tsx          # UI para exercise suggestions
│   └── VoiceAssistant.tsx      # UI para telemedicina
├── patient/
│   ├── MovementRecorder.tsx    # Gravação + análise
│   ├── DocumentUploader.tsx    # Upload + análise PDF
│   └── ProgressAI.tsx          # Relatórios com IA
└── ...

apps/patient-ios/
├── lib/
│   └── features/
│       ├── ExerciseRecorder.swift
│       ├── VoiceAssistant.swift
│       └── ProgressCharts.swift
└── ...

apps/professional-ios/
├── lib/
│   └── features/
│       ├── ClinicalAssistant.swift
│       ├── PatientAnalytics.swift
│       └── TreatmentPlanner.swift
└── ...
```

---

## Plano de Migração (Integração com Arquitetura Atual)

### Passo 1: Setup Inicial (Semana 1)
```bash
# 1. Configurar Firebase AI Logic no console
# 2. Instalar SDKs
npm install firebase/app firebase/ai

# 3. Criar arquivos de configuração
touch packages/shared-api/src/firebase/ai/config.ts
touch packages/shared-api/src/firebase/ai/models.ts

# 4. Configurar App Check
touch src/lib/firebase/app-check.ts

# 5. Configurar Remote Config
touch src/lib/firebase/remote-config.ts
```

### Passo 2: Migrar Features AI Existentes (Semana 2-3)
```typescript
// ARQUIVO: src/inngest/workflows/ai-insights.ts
// ATUAL: Usa OpenAI
// MIGRAR PARA: Firebase AI Logic

// Antes:
import { openai } from '@ai-sdk/openai';

// Depois:
import { getGenerativeModel } from 'firebase/ai';
```

### Passo 3: Implementar Novas Features (Semana 4+)
- Seguir roadmap acima

---

## Considerações de Custos

### Estimativa de Custos (Gemini Developer API)

| Modelo | Input / 1M tokens | Output / 1M tokens |
|--------|-------------------|-------------------|
| Gemini 2.5 Flash | $0.075 | $0.15 |
| Gemini 2.5 Flash-Lite | $0.015 | $0.075 |
| Gemini 2.5 Pro | $1.25 | $5.00 |
| Gemini 3 Pro (preview) | $2.50 | $10.00 |
| Imagen 4 | $0.025 / imagem | - |

### Estratégia de Otimização

1. **Usar Flash-Lite para**: Sugestões de exercícios, chatbots
2. **Usar 2.5 Pro para**: Análises clínicas complexas, SOAP
3. **Usar 3 Pro para**: Análise de vídeo (quando disponível)
4. **Implementar caching**: Respostas comuns
5. **Rate limiting por usuário**: Prevenir abuso

### Exemplo de Custo por Feature

```
Exercise Suggestions (Flash-Lite):
- 5000 tokens input (patient profile)
- 2000 tokens output (5 exercises)
- Custo: ~$0.025 por solicitação

SOAP Assistant (2.5 Pro):
- 10000 tokens input (audio transcript)
- 2000 tokens output (SOAP note)
- Custo: ~$0.15 por consulta

Video Analysis (3 Pro):
- Video processing (10 minutos)
- 50000 tokens equivalent
- Custo: ~$0.50 por análise
```

---

## Métricas de Sucesso

### KPIs a Acompanhar

1. **Adoção**
   - % de clínicas usando features AI
   - Número de sugestões aceitas pelos terapeutas
   - Número de pacientes usando app com IA

2. **Clínicos**
   - Tempo economizado na documentação (SOAP)
   - Precisão das sugestões de exercícios
   - Satisfação dos terapeutas (NPS)

3. **Pacientes**
   - Engajamento com exercícios recomendados
   - Taxa de adesão aos exercícios
   - Tempo de recuperação vs. baseline

4. **Técnicos**
   - Latência das respostas AI
   - Taxa de erro das APIs
   - Custo por usuário

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Custos AI altos | Média | Alto | Rate limiting, cache, modelo otimizado |
| Limitações de modelo | Baixa | Médio | Fallback para lógica existente |
| Problemas de privacidade | Baixa | Crítico | Anonimização, compliance LGPD |
| Resistência dos usuários | Média | Médio | Gradual rollout, treinamento |
| Dependência de API | Baixa | Alto | Multi-provider (Vertex + Gemini Dev) |

---

## Timeline Resumida

| Fase | Duração | Start | End | Entregas |
|------|---------|-------|-----|----------|
| FASE 1 | 3 semanas | Fev 2026 | Fev 2026 | Infraestrutura AI, Prompts, Monitoring |
| FASE 2 | 4 semanas | Fev 2026 | Mar 2026 | Exercise AI, SOAP Assistant, Decision Support |
| FASE 3 | 6 semanas | Mar 2026 | Abr 2026 | Video Analysis, Pain Analysis, PDF Analysis |
| FASE 4 | 8 semanas | Abr 2026 | Jun 2026 | Live API Voice Assistant, Real-time Coaching |
| FASE 5 | 6 semanas | Jun 2026 | Jul 2026 | Predictive Analytics, Population Health |

**Total**: ~27 semanas (6-7 meses)

---

## Recursos Necessários

### Pessoas
- 1 Engenheiro AI/ML (full-time)
- 1 Engenheiro Mobile iOS (50%)
- 1 Engenheiro Frontend (50%)
- 1 Fisioterapeuta (consultor)

### Ferramentas
- Firebase Project (Blaze plan)
- Google Cloud credits para AI
- Sistema de monitoring (Sentry + custom)
- Ambiente de staging para testes

---

## Próximos Passos Imediatos

1. **Esta semana**:
   - [ ] Configurar Firebase AI Logic no projeto
   - [ ] Instalar SDKs (`firebase/app`, `firebase/ai`)
   - [ ] Setup App Check
   - [ ] Criar estrutura de pastas

2. **Próximas 2 semanas**:
   - [ ] Implementar sistema de prompts
   - [ ] Migrar `ai-insights.ts` para Firebase AI
   - [ ] Implementar tracking de custos
   - [ ] Configurar Remote Config

3. **Próximas 4 semanas**:
   - [ ] Exercise AI Assistant
   - [ ] SOAP Note Assistant
   - [ ] Testes com usuários piloto

---

## Fontes

- [Firebase AI Logic Documentation](https://firebase.google.com/docs/ai-logic)
- [Supported Models](https://firebase.google.com/docs/ai-logic/models)
- [Live API Capabilities](https://firebase.google.com/docs/ai-logic/live-api/capabilities)
- [Pricing](https://firebase.google.com/docs/ai-logic/pricing)
- [Rate Limits](https://firebase.google.com/docs/ai-logic/rate-limits)

---

**Documento versão 1.0 - Última atualização: Janeiro 2026**
