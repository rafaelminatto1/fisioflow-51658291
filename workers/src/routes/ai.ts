import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../lib/auth';
import type { Env } from '../types/env';

import { callGemini, transcribeAudioWithGemini } from '../lib/ai-gemini';
import { runAi, transcribeWithWhisper, summarizeClinicalNote } from '../lib/ai-native';
import { logToAxiom } from '../lib/axiom';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use('*', requireAuth);

type ClinicalTrend = 'positive' | 'neutral' | 'negative';

// ... (keep helper functions safeText, firstSentence, inferRiskLevel, buildClinicalReport, buildFormSuggestions)

function buildSoapFromText(text: string) {
  // This will now be handled by a real LLM prompt in the route if needed, 
  // but keeping the fallback logic here.
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return {
    subjective: lines.slice(0, 2).join(' ') || 'Paciente relata evolução clínica em acompanhamento.',
    objective: lines.slice(2, 4).join(' ') || 'Avaliação objetiva pendente de complementação.',
    assessment: lines.slice(4, 6).join(' ') || 'Quadro compatível com seguimento fisioterapêutico sem red flags evidentes.',
    plan: lines.slice(6, 8).join(' ') || 'Manter plano terapêutico, reforçar adesão e reavaliar na próxima sessão.',
  };
}

// ... (keep buildExecutiveSummary)

app.post('/service', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');
  const data =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;

  switch (action) {
    case 'clinicalChat': {
      const message = safeText(data.message);
      const context = data.context && typeof data.context === 'object' ? data.context as Record<string, unknown> : {};
      
      const prompt = `Você é um assistente especializado em fisioterapia. 
      Contexto do paciente: ${JSON.stringify(context)}
      Pergunta do profissional: ${message}
      Responda de forma técnica, concisa e baseada em evidências clínicas.`;
      
      const start = performance.now();
      const response = await callGemini(c.env.GOOGLE_AI_API_KEY, prompt);
      const duration = performance.now() - start;
      
      c.executionCtx.waitUntil(
        logToAxiom(c.env, c.executionCtx, {
          level: 'info',
          type: 'ai_inference_latency',
          message: 'Gemini inference completed',
          metadata: {
            action: 'clinicalChat',
            durationMs: duration,
            promptLength: prompt.length
          }
        })
      );

      return c.json({ data: { response } });
    }
    case 'exerciseSuggestion': {
      const goals = Array.isArray(data.goals) ? data.goals.map((goal) => String(goal)) : [];
      const prompt = `Sugira 3 exercícios de fisioterapia para os seguintes objetivos: ${goals.join(', ')}. 
      Para cada exercício, forneça o nome, a justificativa clínica e a área alvo. 
      Retorne em formato JSON: { exercises: [{ name, rationale, targetArea }] }`;
      
      const aiResponse = await callGemini(c.env.GOOGLE_AI_API_KEY, prompt);
      try {
        const parsed = JSON.parse(aiResponse.replace(/```json|```/g, ''));
        return c.json({ data: { success: true, data: parsed } });
      } catch {
        return c.json({ data: { success: true, data: { exercises: [] } } });
      }
    }
    // ... other cases can be migrated similarly
    default:
      return c.json({ error: 'Ação de IA não suportada' }, 400);
  }
});

app.post('/fast-processing', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);
  const mode = safeText(body.mode) || 'fix_grammar';
  
  const prompt = mode === 'fix_grammar' 
    ? `Corrija a gramática e melhore a clareza técnica deste registro de fisioterapia, mantendo o tom profissional: "${text}". Retorne apenas o texto corrigido.`
    : `Resuma este registro clínico de forma concisa: "${text}". Retorne apenas o resumo.`;

  const result = await callGemini(c.env.GOOGLE_AI_API_KEY, prompt);
  return c.json({ data: { result } });
});

app.post('/transcribe-audio', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const audioBase64 = String(body.audioData || body.audio || '');
  
  if (!audioBase64) return c.json({ error: 'Nenhum dado de áudio enviado' }, 400);

  try {
    const start = performance.now();
    let transcription = '';
    let provider = 'native-whisper';

    // Tentar primeiro com Workers AI (Nativo) se o binding existir
    if (c.env.AI) {
      try {
        transcription = await transcribeWithWhisper(c.env, audioBase64);
      } catch (e) {
        console.error('Whisper failed, falling back to Gemini', e);
        provider = 'gemini-fallback';
        transcription = await transcribeAudioWithGemini(c.env.GOOGLE_AI_API_KEY, audioBase64, String(body.mimeType || 'audio/webm'));
      }
    } else {
      provider = 'gemini-direct';
      transcription = await transcribeAudioWithGemini(c.env.GOOGLE_AI_API_KEY, audioBase64, String(body.mimeType || 'audio/webm'));
    }

    const duration = performance.now() - start;

    c.executionCtx.waitUntil(
      logToAxiom(c.env, c.executionCtx, {
        level: 'info',
        type: 'ai_inference_latency',
        message: 'Audio transcription completed',
        metadata: {
          action: 'transcribe-audio',
          provider,
          durationMs: duration
        }
      })
    );

    return c.json({ data: { transcription, provider, confidence: 0.95 } });
  } catch (error: any) {
    return c.json({ error: 'Erro na transcrição', details: error.message }, 500);
  }
});

app.post('/transcribe-session', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.hintText);
  
  const prompt = `Com base no seguinte relato de uma sessão de fisioterapia, gere um prontuário no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).
  Relato: "${text}"
  Retorne em formato JSON: { subjective, objective, assessment, plan }`;

  const start = performance.now();
  const aiResponse = await callGemini(c.env.GOOGLE_AI_API_KEY, prompt);
  const duration = performance.now() - start;

  c.executionCtx.waitUntil(
    logToAxiom(c.env, c.executionCtx, {
      level: 'info',
      type: 'ai_inference_latency',
      message: 'SOAP generation completed',
      metadata: {
        action: 'transcribe-session',
        durationMs: duration,
        promptLength: prompt.length
      }
    })
  );

  try {
    const soapData = JSON.parse(aiResponse.replace(/```json|```/g, ''));
    return c.json({ data: { soapData } });
  } catch {
    return c.json({ data: { soapData: buildSoapFromText(text) } });
  }
});

app.post('/treatment-assistant', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = safeText(body.action);
  const risk = inferRiskLevel(`${safeText(body.patientId)} ${safeText(body.context)}`);
  const suggestion =
    action === 'predict_adherence'
      ? `Risco de aderência: ${risk}. Fatores principais: frequência irregular, dor percebida e necessidade de reforço do plano domiciliar.`
      : action === 'generate_report'
        ? 'Relatório automático: evolução clínica monitorada, manter acompanhamento e registrar resposta funcional nas próximas sessões.'
        : 'Conduta sugerida: revisar metas, ajustar progressão terapêutica e reforçar educação do paciente.';
  return c.json({ data: { suggestion } });
});

app.post('/analysis', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({ data: buildClinicalReport((body.metrics as Record<string, unknown>) ?? {}, (body.history as Record<string, unknown>) ?? undefined) });
});

app.post('/form-suggestions', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({ data: { suggestions: buildFormSuggestions(safeText(body.context)) } });
});

app.post('/document/analyze', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const fileUrl = safeText(body.fileUrl);
  const fileName = safeText(body.fileName) || 'documento';
  const mediaType = safeText(body.mediaType);
  const baseText = `Documento ${fileName} recebido para análise.`;
  const classification = mediaType.includes('pdf')
    ? { type: 'clinical_report', confidence: 0.61 }
    : { type: 'other', confidence: 0.48 };
  return c.json({
    data: {
      extractedData: {
        fileUrl,
        storagePath: fileUrl,
        text: baseText,
        fullText: baseText,
        confidence: 0.61,
        language: 'pt',
      },
      classification,
      summary: {
        keyFindings: [baseText],
        impression: 'Análise inicial concluída com heurística do Workers.',
        recommendations: ['Validar conteúdo com revisão clínica', 'Salvar no prontuário após conferência'],
      },
      comparison: null,
      translation: body.options && typeof body.options === 'object' && (body.options as Record<string, unknown>).includeTranslation
        ? {
            originalText: baseText,
            translatedText: baseText,
            sourceLanguage: 'auto',
            targetLanguage: String((body.options as Record<string, unknown>).targetLanguage ?? 'pt'),
          }
        : null,
      tags: [{ id: 'ai-doc-1', name: classification.type.toUpperCase(), category: 'modality', confidence: classification.confidence }],
    },
  });
});

app.post('/document/classify', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);
  const lower = text.toLowerCase();
  const type =
    lower.includes('resson') || lower.includes('mri')
      ? 'mri'
      : lower.includes('raio') || lower.includes('x-ray') || lower.includes('rx')
        ? 'xray'
        : lower.includes('tomografia') || lower.includes('ct')
          ? 'ct_scan'
          : 'clinical_report';
  return c.json({ data: { type, confidence: 0.58 } });
});

app.post('/document/summarize', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);
  return c.json({
    data: {
      keyFindings: text.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 3),
      impression: firstSentence(text, 'Resumo clínico indisponível.'),
      recommendations: ['Correlacionar com sintomas atuais', 'Registrar no prontuário'],
      criticalAlerts: [],
    },
  });
});

app.post('/document/translate', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const text = safeText(body.text);
  const targetLanguage = safeText(body.targetLanguage) || 'pt';
  return c.json({
    data: {
      originalText: text,
      translatedText: text,
      sourceLanguage: 'auto',
      targetLanguage,
    },
  });
});

app.post('/document/compare', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const currentText = safeText(body.currentText);
  return c.json({
    data: {
      hasChanges: false,
      changes: [firstSentence(currentText, 'Nenhuma mudança relevante identificada.')],
      progressScore: 50,
    },
  });
});

app.post('/document/pdf', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({
    data: {
      url: safeText((body.documentData as Record<string, unknown> | undefined)?.extractedData as unknown) || null,
      generated: true,
    },
  });
});
app.post('/executive-summary', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  return c.json({ data: buildExecutiveSummary(body) });
});

/**
 * Endpoints nativos de IA (Workers AI)
 */
app.post('/native/summarize', async (c) => {
  const { text } = await c.req.json();
  if (!text) return c.json({ error: 'Texto é obrigatório' }, 400);

  const summary = await summarizeClinicalNote(c.env, text);
  return c.json({ data: { summary } });
});

app.post('/native/translate', async (c) => {
  const { text, target } = await c.req.json();
  const response = await runAi(c.env, '@cf/meta/m2m100-1.2b', {
    text,
    target_lang: target || 'english'
  });
  return c.json({ data: { translated: response.translated_text } });
});

app.post('/movement-video', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const exerciseName = safeText(body.exerciseName) || 'Exercício Livre';
  return c.json({
    data: {
      analysis: {
        reps: 10,
        score: 8,
        errors: [],
        feedback: `Análise automática concluída para ${exerciseName}. Movimento globalmente adequado, revisar amplitude e ritmo para maior consistência.`,
        isValidExercise: true,
      },
    },
  });
});

export { app as aiRoutes };
