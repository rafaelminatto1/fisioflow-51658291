import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { createDb } from '../lib/db';
import { requireAuth } from '../lib/auth';
import { clinicalScribeLogs } from '@fisioflow/db';
import type { Env } from '../types/env';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /api/ia-studio/scribe/process
 * Processa áudio do escriba e gera texto formatado
 */
app.post('/scribe/process', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { patientId, section, audioBase64 } = body;

  if (!patientId || !section || !audioBase64) {
    return c.json({ error: 'Campos obrigatórios ausentes' }, 400);
  }

  const db = await createDb(c.env);

  try {
    // 1. Converter Base64 para Buffer/Uint8Array para o AI Whisper
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

    // 2. Transcrever com Whisper
    console.log('[AI-Studio] Transcrevendo áudio com Whisper...');
    const transcription: any = await c.env.AI.run('@cf/openai/whisper-large-v3-turbo', {
      audio: [...audioBuffer],
    });

    const rawText = transcription.text;
    if (!rawText) throw new Error('Falha na transcrição');

    // 3. Refinar com Llama 3.1 70B
    console.log('[AI-Studio] Refinando texto com Llama 3.1...');
    const sectionName = {
      S: 'Subjetivo (Queixas e Histórico)',
      O: 'Objetivo (Medições e Exames)',
      A: 'Avaliação (Raciocínio Clínico)',
      P: 'Plano (Condutas e Próximos Passos)'
    }[section as 'S'|'O'|'A'|'P'] || section;

    const prompt = `
      Você é um assistente de fisioterapia especializado em documentação clínica SOAP.
      Sua tarefa é converter o texto transcrito de um ditado de voz em um parágrafo profissional, 
      usando terminologia técnica precisa da fisioterapia brasileira.

      Seção Atual: ${sectionName}
      Texto Transcrito: "${rawText}"

      Regras:
      1. Use terminologia clínica (ex: use 'ADM' em vez de 'movimento', 'algia' em vez de 'dor').
      2. Mantenha o tom profissional e conciso.
      3. Não adicione informações que não estavam no ditado.
      4. Retorne APENAS o texto refinado, sem introduções ou explicações.
    `;

    const refinement: any = await c.env.AI.run('@cf/meta/llama-3.1-70b-instruct', {
      messages: [
        { role: 'system', content: 'Você é um redator de prontuários de fisioterapia experiente.' },
        { role: 'user', content: prompt }
      ]
    });

    const formattedText = refinement.response;

    // 4. Salvar Log
    await db.insert(clinicalScribeLogs).values({
      organizationId: user.organizationId,
      patientId,
      therapistId: user.uid,
      section,
      rawText,
      formattedText,
      tokensUsed: 0, // Poderia ser calculado se necessário
    });

    return c.json({
      success: true,
      rawText,
      formattedText
    });

  } catch (error: any) {
    console.error('[AI-Studio] Erro no processamento do escriba:', error);
    return c.json({ 
      error: 'Erro ao processar áudio', 
      details: error.message 
    }, 500);
  }
});

export { app as aiStudioRoutes };
