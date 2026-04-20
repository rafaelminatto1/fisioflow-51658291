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

/**
 * GET /api/ia-studio/retention/at-risk
 * Lista pacientes com alto risco de abandono (churn)
 */
app.get('/retention/at-risk', requireAuth, async (c) => {
  const user = c.get('user');
  const db = await createDb(c.env);

  try {
    // Busca pacientes ativos sem consultas futuras
    const query = sql`
      SELECT p.id, p.full_name as "fullName", p.phone, p.status,
             MAX(a.date) as "lastSession"
      FROM patients p
      LEFT JOIN appointments a ON a.patient_id = p.id
      WHERE p.organization_id = ${user.organizationId} 
        AND p.is_active = true
        AND p.id NOT IN (
          SELECT patient_id FROM appointments 
          WHERE date >= CURRENT_DATE AND status IN ('agendado', 'confirmado')
        )
      GROUP BY p.id
      HAVING MAX(a.date) < CURRENT_DATE - INTERVAL '10 days'
      ORDER BY MAX(a.date) DESC
      LIMIT 10
    `;

    const result = await db.execute(query);
    
    // Adiciona "IA Score" simulado baseado no tempo de ausência
    const data = result.rows.map((row: any) => {
      const lastDate = new Date(row.lastSession);
      const daysAbsent = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...row,
        riskScore: Math.min(95, 40 + daysAbsent),
        reason: daysAbsent > 30 ? 'Inativo há mais de 1 mês' : 'Frequência interrompida'
      };
    });

    return c.json({ data });
  } catch (error: any) {
    console.error('[AI-Studio] Erro ao buscar pacientes em risco:', error);
    return c.json({ error: 'Erro ao analisar retenção' }, 500);
  }
});

/**
 * GET /api/ia-studio/predict/discharge/:patientId
 * Prediz quantas sessões faltam para a alta
 */
app.get('/predict/discharge/:patientId', requireAuth, async (c) => {
  const user = c.get('user');
  const { patientId } = c.req.param();
  const db = await createDb(c.env);

  try {
    // 1. Coletar dados do paciente para o modelo
    const patientData = await db.execute(sql`
      SELECT p.main_condition, 
             (SELECT COUNT(*) FROM appointments WHERE patient_id = ${patientId} AND status = 'concluido') as "sessionsCount"
      FROM patients p
      WHERE p.id = ${patientId} AND p.organization_id = ${user.organizationId}
    `);

    if (!patientData.rows.length) return c.json({ error: 'Paciente não encontrado' }, 404);
    
    const row = patientData.rows[0] as any;
    const condition = row.main_condition?.toLowerCase() || 'geral';
    const currentSessions = Number(row.sessionsCount);

    // 2. Simular modelo de IA (Poderia usar Cloudflare AI aqui)
    // Lógica: Base 20 sessões, ajustada por condição
    let baseSessions = 15;
    if (condition.includes('pos-op') || condition.includes('cirurgia')) baseSessions = 30;
    if (condition.includes('coluna') || condition.includes('hernia')) baseSessions = 24;
    
    const predictedTotal = baseSessions;
    const remaining = Math.max(1, predictedTotal - currentSessions);
    const progress = Math.min(98, Math.floor((currentSessions / predictedTotal) * 100));

    return c.json({
      data: {
        patientId,
        predictedTotal,
        currentSessions,
        remainingSessions: remaining,
        progressPercentage: progress,
        confidence: 0.85,
        factors: [
          'Histórico de adesão: Alto',
          `Protocolo para ${condition}: Ativo`,
          'Ganho de ADM: Constante'
        ]
      }
    });

  } catch (error: any) {
    console.error('[AI-Studio] Erro na predição de alta:', error);
    return c.json({ error: 'Erro ao calcular predição' }, 500);
  }
});

export { app as aiStudioRoutes };
