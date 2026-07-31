/**
 * Painel de condutas, regiões e exercícios.
 *
 * Why: a clínica tem 343 mil termos clínicos já extraídos das evoluções e
 * nenhuma tela que responda "o que a gente faz, afinal?". Sem isso, decisão de
 * compra de equipamento, escala de profissional e desenho de protocolo saem de
 * impressão pessoal. Aqui o dado que já existe vira contagem.
 *
 * Duas contagens por termo, deliberadamente:
 *  - `evolucoes`: em quantas sessões o termo apareceu — mede volume de trabalho
 *    e justifica equipamento (TENS em 7.597 evoluções é uso de aparelho).
 *  - `pacientes`: em quantos pacientes distintos — mede abrangência. Um recurso
 *    com muitas evoluções e poucos pacientes é protocolo intensivo de nicho,
 *    não prática difundida, e confundir os dois leva a comprar o aparelho errado.
 *
 * Base: apenas `source_table = 'sessions'`. Avaliação não é evolução; misturar
 * as duas contaria a conduta planejada junto com a conduta executada.
 */

import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";
import { CONDUTAS, EXERCICIOS, REGIOES, LEXICON_VERSION } from "../../lib/clinical/lexicon";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/** Categorias expostas e o bloco do léxico que dá o rótulo em PT-BR. */
const CATEGORIAS = {
  conduta: CONDUTAS,
  regiao: REGIOES,
  exercicio: EXERCICIOS,
} as const;

type Categoria = keyof typeof CATEGORIAS;

const CHAVE_RESPOSTA: Record<Categoria, string> = {
  conduta: "condutas",
  regiao: "regioes",
  exercicio: "exercicios",
};

/**
 * Teto de itens por categoria.
 *
 * O léxico tem dezenas de códigos por categoria e a cauda longa não informa
 * decisão nenhuma — quem precisa do detalhe filtra por paciente ou período.
 */
const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 100;

/** Rótulo em PT-BR do código; cai no próprio código se o léxico mudou. */
function rotulo(categoria: Categoria, code: string): string {
  return CATEGORIAS[categoria].find((e) => e.code === code)?.label ?? code;
}

/** Aceita só YYYY-MM-DD: data inválida vira filtro nulo, não erro silencioso. */
function lerData(valor: string | undefined): string | null {
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  return Number.isNaN(Date.parse(valor)) ? null : valor;
}

function lerUuid(valor: string | undefined): string | null {
  if (!valor) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
    ? valor
    : null;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/analytics/clinical-patterns
 *
 * Query params: `desde=YYYY-MM-DD`, `ate=YYYY-MM-DD`, `patientId`, `limit`.
 */
app.get("/clinical-patterns", requireAuth, async (c) => {
  const user = c.get("user");
  const org = user.organizationId;
  const desde = lerData(c.req.query("desde"));
  const ate = lerData(c.req.query("ate"));
  const patientId = lerUuid(c.req.query("patientId"));
  const limitRaw = Number(c.req.query("limit") ?? LIMITE_PADRAO);
  const limite = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.trunc(limitRaw), 1), LIMITE_MAXIMO)
    : LIMITE_PADRAO;

  const sql = getRawSql(c.env, "read");
  const categorias = Object.keys(CATEGORIAS) as Categoria[];

  try {
    // O JOIN com sessions não é só pelo filtro de data: é ele que descarta
    // extração de sessão apagada, que continua na tabela de extrações.
    const termosQ = sql`
      WITH base AS (
        SELECT e.category, e.code, e.source_id, e.patient_id
          FROM clinical_extractions e
          JOIN sessions s ON s.id = e.source_id AND s.deleted_at IS NULL
         WHERE e.organization_id = ${org}::uuid
           AND e.rejected = false
           AND e.source_table = 'sessions'
           AND e.category = ANY(${categorias}::text[])
           AND (${desde}::date IS NULL OR s.date >= ${desde}::date)
           AND (${ate}::date IS NULL OR s.date <= ${ate}::date)
           AND (${patientId}::uuid IS NULL OR e.patient_id = ${patientId}::uuid)
      ),
      agrupado AS (
        SELECT category, code,
               count(DISTINCT source_id) AS evolucoes,
               count(DISTINCT patient_id) AS pacientes
          FROM base
         GROUP BY category, code
      )
      SELECT category, code, evolucoes, pacientes
        FROM (
          SELECT *, row_number() OVER (
                   PARTITION BY category ORDER BY evolucoes DESC, code ASC
                 ) AS rn
            FROM agrupado
        ) ranqueado
       WHERE rn <= ${limite}::int
       ORDER BY category ASC, evolucoes DESC
    `;

    // Denominador do recorte: sem ele "8.299 evoluções" não tem escala.
    const baseQ = sql`
      SELECT count(*) AS evolucoes, count(DISTINCT s.patient_id) AS pacientes
        FROM sessions s
       WHERE s.organization_id = ${org}::uuid
         AND s.deleted_at IS NULL
         AND (${desde}::date IS NULL OR s.date >= ${desde}::date)
         AND (${ate}::date IS NULL OR s.date <= ${ate}::date)
         AND (${patientId}::uuid IS NULL OR s.patient_id = ${patientId}::uuid)
    `;

    const [termos, base] = await Promise.all([termosQ, baseQ]);

    const b = (base.rows?.[0] ?? {}) as Record<string, unknown>;
    const totalEvolucoes = num(b.evolucoes);

    const data: Record<string, unknown[]> = {};
    for (const categoria of categorias) data[CHAVE_RESPOSTA[categoria]] = [];

    for (const linha of (termos.rows ?? []) as Record<string, unknown>[]) {
      const categoria = String(linha.category) as Categoria;
      if (!CATEGORIAS[categoria]) continue;
      const evolucoes = num(linha.evolucoes);
      data[CHAVE_RESPOSTA[categoria]].push({
        codigo: String(linha.code),
        rotulo: rotulo(categoria, String(linha.code)),
        evolucoes,
        pacientes: num(linha.pacientes),
        // Percentual sobre as evoluções do recorte, não sobre o total de
        // extrações: "em 24% dos atendimentos" é a leitura que a clínica faz.
        percentualEvolucoes:
          totalEvolucoes > 0 ? Math.round((evolucoes / totalEvolucoes) * 1000) / 10 : 0,
      });
    }

    return c.json({
      data,
      meta: {
        filtros: { desde, ate, patientId, limitePorCategoria: limite },
        base: { evolucoes: totalEvolucoes, pacientes: num(b.pacientes) },
        lexiconVersion: LEXICON_VERSION,
        criterios: {
          fonte:
            "clinical_extractions com rejected = false e source_table = 'sessions', " +
            "isolado por organização e restrito a sessões não apagadas",
          evolucoes: "sessões distintas em que o termo apareceu ao menos uma vez",
          pacientes: "pacientes distintos com ao menos uma ocorrência do termo",
          percentualEvolucoes: "sobre o total de sessões do recorte, não sobre o total de termos",
        },
        naoDisponivel: {
          porProfissional:
            "nenhum recorte por profissional: a autoria histórica das evoluções foi reconstruída " +
            "da assinatura no texto e não sustenta comparação entre fisioterapeutas",
          desfecho:
            "o painel conta o que foi feito, não o que funcionou — não há grupo de comparação " +
            "que autorize ler frequência de conduta como efetividade",
        },
      },
    });
  } catch (error: any) {
    console.error("[Analytics/ClinicalPatterns] erro:", error);
    return c.json(
      { error: "Falha ao agregar padrões clínicos", details: error.message },
      500,
    );
  }
});

export default app;
