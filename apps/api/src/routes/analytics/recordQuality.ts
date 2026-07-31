/**
 * Qualidade do prontuário.
 *
 * Why: os indicadores clínicos e o RAG dependem de dado estruturado, e o buraco
 * do prontuário é invisível no dia a dia — ninguém percebe que 902 atendimentos
 * cobrados não têm evolução vinculada até alguém precisar do histórico (auditoria,
 * relatório ao médico, defesa em conselho). Este endpoint torna a lacuna contável
 * e, principalmente, corrigível: cada número vem com a lista dos registros
 * afetados, porque "902" não é uma tarefa e "estes 50 atendimentos" é.
 *
 * Nenhum indicador aqui é atribuído a profissional: a autoria histórica foi
 * reconstruída a partir da assinatura da evolução e não é confiável para ranking.
 */

import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Piso de caracteres para a observação contar como evolução preenchida.
 *
 * 80 caracteres é aproximadamente uma frase completa. Abaixo disso o registro é
 * do tipo "ok", "manteve conduta" — não sustenta continuidade de cuidado nem
 * alimenta extração clínica. Não é métrica de produtividade: é lista de
 * prontuários a completar.
 */
const OBSERVACAO_MIN_CHARS = 80;

/** Janela recente para priorizar backfill: dado velho raramente é recuperável. */
const JANELA_RECENTE_DIAS = 90;

interface Paginacao {
  includeList: boolean;
  limit: number;
  offset: number;
  indicador: string | null;
}

function lerPaginacao(query: (k: string) => string | undefined): Paginacao {
  const limitRaw = Number(query("limit") ?? 50);
  const offsetRaw = Number(query("offset") ?? 0);
  return {
    includeList: query("includeList") === "true",
    limit: Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50,
    offset: Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0,
    indicador: query("indicador") ?? null,
  };
}

function querListaDe(p: Paginacao, chave: string): boolean {
  return p.includeList && (p.indicador === null || p.indicador === chave);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/analytics/record-quality
 *
 * Query params: `includeList=true`, `limit`, `offset`, `indicador=<chave>`.
 */
app.get("/record-quality", requireAuth, async (c) => {
  const user = c.get("user");
  const org = user.organizationId;
  const pag = lerPaginacao((k) => c.req.query(k));
  const sql = getRawSql(c.env, "read");

  try {
    const agregadoQ = sql`
      SELECT
        (SELECT count(*)
           FROM appointments a
          WHERE a.organization_id = ${org}::uuid
            AND a.deleted_at IS NULL
            AND a.status = 'atendido'
            AND NOT EXISTS (
              SELECT 1 FROM sessions s
               WHERE s.appointment_id = a.id AND s.deleted_at IS NULL
            )) AS sem_sessao,
        (SELECT count(*)
           FROM appointments a
          WHERE a.organization_id = ${org}::uuid
            AND a.deleted_at IS NULL
            AND a.status = 'atendido'
            AND a.date >= CURRENT_DATE - ${JANELA_RECENTE_DIAS}::int
            AND NOT EXISTS (
              SELECT 1 FROM sessions s
               WHERE s.appointment_id = a.id AND s.deleted_at IS NULL
            )) AS sem_sessao_recente,
        (SELECT count(*)
           FROM patients p
          WHERE p.organization_id = ${org}::uuid
            AND EXISTS (
              SELECT 1 FROM sessions s
               WHERE s.patient_id = p.id AND s.deleted_at IS NULL
            )
            AND NOT EXISTS (
              SELECT 1 FROM patient_evaluation_responses r WHERE r.patient_id = p.id
            )) AS sem_avaliacao,
        (SELECT count(*)
           FROM patients p
          WHERE p.organization_id = ${org}::uuid
            AND (p.phone IS NULL OR btrim(p.phone) = '')) AS sem_telefone,
        (SELECT count(*)
           FROM sessions s
          WHERE s.organization_id = ${org}::uuid
            AND s.deleted_at IS NULL
            AND length(btrim(coalesce(s.observacao, ''))) < ${OBSERVACAO_MIN_CHARS}::int
        ) AS observacao_curta
    `;

    const listaSemSessaoQ = querListaDe(pag, "agendamentosSemSessao")
      ? sql`
          SELECT a.id AS "appointmentId", a.date, a.start_time AS "startTime",
                 a.patient_id AS "patientId", p.full_name AS "patientName"
          FROM appointments a
          LEFT JOIN patients p ON p.id = a.patient_id
          WHERE a.organization_id = ${org}::uuid
            AND a.deleted_at IS NULL
            AND a.status = 'atendido'
            AND NOT EXISTS (
              SELECT 1 FROM sessions s
               WHERE s.appointment_id = a.id AND s.deleted_at IS NULL
            )
          ORDER BY a.date DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaSemAvaliacaoQ = querListaDe(pag, "pacientesSemAvaliacao")
      ? sql`
          SELECT p.id AS "patientId", p.full_name AS "patientName", p.phone,
                 count(s.id) AS "sessoes",
                 min(s.date) AS "primeiraSessao",
                 max(s.date) AS "ultimaSessao"
          FROM patients p
          JOIN sessions s ON s.patient_id = p.id AND s.deleted_at IS NULL
          WHERE p.organization_id = ${org}::uuid
            AND NOT EXISTS (
              SELECT 1 FROM patient_evaluation_responses r WHERE r.patient_id = p.id
            )
          GROUP BY p.id, p.full_name, p.phone
          ORDER BY max(s.date) DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaSemTelefoneQ = querListaDe(pag, "pacientesSemTelefone")
      ? // A data de admissão exibida é a da primeira sessão. O campo de criação
        // do cadastro é igual para os 1.022 pacientes (data da migração) e não
        // permite ordenar nem coortizar nada.
        sql`
          SELECT p.id AS "patientId", p.full_name AS "patientName", p.email,
                 (SELECT min(s.date) FROM sessions s
                   WHERE s.patient_id = p.id AND s.deleted_at IS NULL) AS "primeiraSessao"
          FROM patients p
          WHERE p.organization_id = ${org}::uuid
            AND (p.phone IS NULL OR btrim(p.phone) = '')
          ORDER BY p.full_name ASC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaObservacaoCurtaQ = querListaDe(pag, "sessoesObservacaoCurta")
      ? sql`
          SELECT s.id AS "sessionId", s.date, s.patient_id AS "patientId",
                 p.full_name AS "patientName",
                 length(btrim(coalesce(s.observacao, ''))) AS "caracteres"
          FROM sessions s
          LEFT JOIN patients p ON p.id = s.patient_id
          WHERE s.organization_id = ${org}::uuid
            AND s.deleted_at IS NULL
            AND length(btrim(coalesce(s.observacao, ''))) < ${OBSERVACAO_MIN_CHARS}::int
          ORDER BY s.date DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const [agregado, semSessao, semAvaliacao, semTelefone, obsCurta] = await Promise.all([
      agregadoQ,
      listaSemSessaoQ,
      listaSemAvaliacaoQ,
      listaSemTelefoneQ,
      listaObservacaoCurtaQ,
    ]);

    const a = (agregado.rows?.[0] ?? {}) as Record<string, unknown>;

    return c.json({
      data: {
        agendamentosSemSessao: {
          valor: num(a.sem_sessao),
          // O recorte recente é o que a equipe consegue recuperar de memória;
          // o total serve para dimensionar a dívida histórica.
          recentes: num(a.sem_sessao_recente),
          lista: semSessao?.rows,
        },
        pacientesSemAvaliacao: { valor: num(a.sem_avaliacao), lista: semAvaliacao?.rows },
        pacientesSemTelefone: { valor: num(a.sem_telefone), lista: semTelefone?.rows },
        sessoesObservacaoCurta: { valor: num(a.observacao_curta), lista: obsCurta?.rows },
      },
      meta: {
        paginacao: { limit: pag.limit, offset: pag.offset, includeList: pag.includeList },
        criterios: {
          agendamentosSemSessao:
            "appointment com status 'atendido' sem nenhuma sessão ativa apontando para ele",
          recentes: `últimos ${JANELA_RECENTE_DIAS} dias`,
          sessoesObservacaoCurta: `observacao com menos de ${OBSERVACAO_MIN_CHARS} caracteres úteis`,
          pacientesSemTelefone:
            "phone nulo ou vazio — bloqueia lembrete, confirmação e reativação por WhatsApp",
        },
        naoDisponivel: {
          porProfissional:
            "nenhum indicador de qualidade é atribuído a profissional: a autoria histórica foi reconstruída da assinatura da evolução e não sustenta comparação",
        },
      },
    });
  } catch (error: any) {
    console.error("[Analytics/RecordQuality] erro:", error);
    return c.json({ error: "Falha ao calcular qualidade de prontuário", details: error.message }, 500);
  }
});

export default app;
