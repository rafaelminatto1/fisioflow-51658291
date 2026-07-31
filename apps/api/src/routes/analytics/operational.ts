/**
 * Indicadores operacionais da clínica.
 *
 * Why: os números de ocupação e abandono só viram ação quando a recepção sabe
 * PARA QUEM ligar. Um painel que mostra "146 pacientes ativos sem retorno
 * marcado" e não diz quais é um número decorativo — por isso todo indicador
 * aqui carrega a lista paginada dos afetados (`?includeList=true`).
 *
 * PROIBIÇÃO DELIBERADA: não existe, e não deve existir, taxa de falta por
 * profissional. A autoria dos agendamentos históricos foi derivada de quem
 * assinou a evolução clínica, e falta não gera evolução — 94,6% das faltas
 * ficaram sem autor. Qualquer taxa por profissional seria enviesada para baixo
 * de forma sistemática e desigual entre os fisioterapeutas. Volume de
 * atendimentos por profissional é seguro (atendimento gera evolução) e está
 * exposto; taxa de falta por profissional, não.
 */

import { Hono } from "hono";
import type { Env } from "../../types/env";
import type { AuthVariables } from "../../lib/auth";
import { requireAuth } from "../../lib/auth";
import { getRawSql } from "../../lib/db";

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

/**
 * Status que representam falta do paciente.
 *
 * Valores reais do enum em produção. `cancelado` e `remarcar` ficam de fora
 * de propósito: cancelamento com aviso não é falta, é remanejamento de agenda —
 * misturar os dois infla a taxa e tira a comparabilidade com o mercado.
 */
const STATUS_FALTA = ["faltou", "faltou_com_aviso", "nao_atendido"] as const;

/** Status que caracterizam presença efetiva (denominador da taxa de falta). */
const STATUS_ATENDIDO = ["atendido"] as const;

/** Status de agenda futura ainda válida — o paciente tem retorno marcado. */
const STATUS_FUTURO = ["agendado", "presenca_confirmada", "avaliacao"] as const;

/** Dias sem atendimento para o paciente deixar de contar como ativo. */
const JANELA_ATIVO_DIAS = 60;

/** Início da faixa de risco de abandono (antes disso é intervalo normal). */
const RISCO_ABANDONO_MIN_DIAS = 30;

/**
 * Fim da faixa de risco. Além disso o paciente é caso encerrado de fato e entra
 * em campanha de reativação, não em busca ativa da recepção.
 */
const RISCO_ABANDONO_MAX_DIAS = 90;

/**
 * Teto do intervalo entre sessões que ainda conta como cadência de tratamento.
 *
 * Gaps acima de 60 dias são interrupção de tratamento, não frequência: incluí-los
 * na média mistura duas coisas diferentes e leva o indicador de 5,8 para 10,3
 * dias, escondendo a cadência real de quem está em tratamento.
 */
const GAP_MAX_DIAS = 60;

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
    // Teto de 200: a lista existe para a recepção trabalhar, não para exportar
    // a base inteira por HTTP.
    limit: Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200) : 50,
    offset: Number.isFinite(offsetRaw) ? Math.max(Math.trunc(offsetRaw), 0) : 0,
    indicador: query("indicador") ?? null,
  };
}

/** Só busca a lista do indicador pedido, quando houver filtro `indicador`. */
function querListaDe(p: Paginacao, chave: string): boolean {
  return p.includeList && (p.indicador === null || p.indicador === chave);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/analytics/operational
 *
 * Query params: `includeList=true`, `limit`, `offset`, `indicador=<chave>`.
 */
app.get("/operational", requireAuth, async (c) => {
  const user = c.get("user");
  const org = user.organizationId;
  const pag = lerPaginacao((k) => c.req.query(k));
  const sql = getRawSql(c.env, "read");

  try {
    // Um único round-trip para todos os números: a lista só é buscada sob demanda.
    const agregadoQ = sql`
      WITH atendimentos AS (
        SELECT patient_id, therapist_id, date, status
        FROM appointments
        WHERE organization_id = ${org}::uuid
          AND deleted_at IS NULL
      ),
      ultimo AS (
        SELECT patient_id, max(date) AS ultima
        FROM atendimentos
        WHERE status = ANY(${STATUS_ATENDIDO as unknown as string[]}::text[])
        GROUP BY patient_id
      ),
      proximo AS (
        SELECT patient_id, min(date) AS proxima
        FROM atendimentos
        WHERE status = ANY(${STATUS_FUTURO as unknown as string[]}::text[])
          AND date >= CURRENT_DATE
        GROUP BY patient_id
      ),
      gaps AS (
        SELECT s.date::date - lag(s.date::date) OVER (
                 PARTITION BY s.patient_id ORDER BY s.date
               ) AS gap
        FROM sessions s
        WHERE s.organization_id = ${org}::uuid
          AND s.deleted_at IS NULL
      )
      SELECT
        (SELECT count(*) FROM atendimentos
          WHERE status = ANY(${STATUS_FALTA as unknown as string[]}::text[])) AS faltas,
        (SELECT count(*) FROM atendimentos
          WHERE status = ANY(${STATUS_ATENDIDO as unknown as string[]}::text[])
             OR status = ANY(${STATUS_FALTA as unknown as string[]}::text[])) AS base_falta,
        (SELECT count(*) FROM ultimo) AS com_atendimento,
        (SELECT count(*) FROM proximo) AS com_proxima,
        (SELECT count(*) FROM ultimo u
          WHERE u.ultima >= CURRENT_DATE - ${JANELA_ATIVO_DIAS}::int
            AND NOT EXISTS (SELECT 1 FROM proximo p WHERE p.patient_id = u.patient_id)
        ) AS ativos_sem_proxima,
        (SELECT count(*) FROM ultimo u
          WHERE u.ultima < CURRENT_DATE - ${RISCO_ABANDONO_MIN_DIAS}::int
            AND u.ultima >= CURRENT_DATE - ${RISCO_ABANDONO_MAX_DIAS}::int
            AND NOT EXISTS (SELECT 1 FROM proximo p WHERE p.patient_id = u.patient_id)
        ) AS risco_abandono,
        (SELECT avg(gap) FROM gaps
          WHERE gap BETWEEN 1 AND ${GAP_MAX_DIAS}::int) AS intervalo_medio,
        (SELECT count(DISTINCT patient_id) FROM sessions
          WHERE organization_id = ${org}::uuid AND deleted_at IS NULL
            AND date >= CURRENT_DATE - 30) AS ativos_30d,
        (SELECT count(*) FROM sessions
          WHERE organization_id = ${org}::uuid AND deleted_at IS NULL
            AND date >= CURRENT_DATE - 30) AS sessoes_30d
    `;

    const listaFaltasQ = querListaDe(pag, "faltas")
      ? sql`
          SELECT a.id AS "appointmentId", a.date, a.status,
                 a.patient_id AS "patientId", p.full_name AS "patientName", p.phone
          FROM appointments a
          LEFT JOIN patients p ON p.id = a.patient_id
          WHERE a.organization_id = ${org}::uuid
            AND a.deleted_at IS NULL
            AND a.status = ANY(${STATUS_FALTA as unknown as string[]}::text[])
          ORDER BY a.date DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaAtivosSemProximaQ = querListaDe(pag, "ativosSemProximaSessao")
      ? sql`
          WITH ultimo AS (
            SELECT patient_id, max(date) AS ultima
            FROM appointments
            WHERE organization_id = ${org}::uuid AND deleted_at IS NULL
              AND status = ANY(${STATUS_ATENDIDO as unknown as string[]}::text[])
            GROUP BY patient_id
          )
          SELECT u.patient_id AS "patientId", p.full_name AS "patientName", p.phone,
                 u.ultima AS "ultimoAtendimento",
                 (CURRENT_DATE - u.ultima) AS "diasSemAtendimento"
          FROM ultimo u
          JOIN patients p ON p.id = u.patient_id
          WHERE u.ultima >= CURRENT_DATE - ${JANELA_ATIVO_DIAS}::int
            AND NOT EXISTS (
              SELECT 1 FROM appointments f
              WHERE f.organization_id = ${org}::uuid AND f.deleted_at IS NULL
                AND f.patient_id = u.patient_id
                AND f.status = ANY(${STATUS_FUTURO as unknown as string[]}::text[])
                AND f.date >= CURRENT_DATE
            )
          ORDER BY u.ultima DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaRiscoQ = querListaDe(pag, "riscoAbandono")
      ? sql`
          WITH ultimo AS (
            SELECT patient_id, max(date) AS ultima
            FROM appointments
            WHERE organization_id = ${org}::uuid AND deleted_at IS NULL
              AND status = ANY(${STATUS_ATENDIDO as unknown as string[]}::text[])
            GROUP BY patient_id
          )
          SELECT u.patient_id AS "patientId", p.full_name AS "patientName", p.phone,
                 u.ultima AS "ultimoAtendimento",
                 (CURRENT_DATE - u.ultima) AS "diasSemAtendimento"
          FROM ultimo u
          JOIN patients p ON p.id = u.patient_id
          WHERE u.ultima < CURRENT_DATE - ${RISCO_ABANDONO_MIN_DIAS}::int
            AND u.ultima >= CURRENT_DATE - ${RISCO_ABANDONO_MAX_DIAS}::int
            AND NOT EXISTS (
              SELECT 1 FROM appointments f
              WHERE f.organization_id = ${org}::uuid AND f.deleted_at IS NULL
                AND f.patient_id = u.patient_id
                AND f.status = ANY(${STATUS_FUTURO as unknown as string[]}::text[])
                AND f.date >= CURRENT_DATE
            )
          ORDER BY u.ultima ASC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaProximaQ = querListaDe(pag, "comProximaSessao")
      ? sql`
          SELECT a.patient_id AS "patientId", p.full_name AS "patientName", p.phone,
                 min(a.date) AS "proximaSessao"
          FROM appointments a
          JOIN patients p ON p.id = a.patient_id
          WHERE a.organization_id = ${org}::uuid AND a.deleted_at IS NULL
            AND a.status = ANY(${STATUS_FUTURO as unknown as string[]}::text[])
            AND a.date >= CURRENT_DATE
          GROUP BY a.patient_id, p.full_name, p.phone
          ORDER BY min(a.date) ASC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const listaAtivos30Q = querListaDe(pag, "pacientesAtivos30d")
      ? sql`
          SELECT s.patient_id AS "patientId", p.full_name AS "patientName", p.phone,
                 count(*) AS "sessoes", max(s.date) AS "ultimaSessao"
          FROM sessions s
          JOIN patients p ON p.id = s.patient_id
          WHERE s.organization_id = ${org}::uuid AND s.deleted_at IS NULL
            AND s.date >= CURRENT_DATE - 30
          GROUP BY s.patient_id, p.full_name, p.phone
          ORDER BY count(*) DESC, max(s.date) DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    // Volume por profissional é permitido; taxa de falta por profissional, não.
    // Ver o cabeçalho deste arquivo: falta não gera evolução, então a autoria
    // reconstruída existe quase só nos atendimentos realizados.
    const volumeProfissionalQ = querListaDe(pag, "volumePorProfissional")
      ? sql`
          SELECT a.therapist_id AS "therapistId",
                 coalesce(pr.full_name, 'Sem profissional atribuído') AS "therapistName",
                 count(*) AS "atendimentos"
          FROM appointments a
          LEFT JOIN profiles pr ON pr.user_id = a.therapist_id::text
          WHERE a.organization_id = ${org}::uuid AND a.deleted_at IS NULL
            AND a.status = ANY(${STATUS_ATENDIDO as unknown as string[]}::text[])
          GROUP BY a.therapist_id, pr.full_name
          ORDER BY count(*) DESC
          LIMIT ${pag.limit} OFFSET ${pag.offset}
        `
      : null;

    const [agregado, faltas, ativosSemProxima, risco, proxima, ativos30, volume] =
      await Promise.all([
        agregadoQ,
        listaFaltasQ,
        listaAtivosSemProximaQ,
        listaRiscoQ,
        listaProximaQ,
        listaAtivos30Q,
        volumeProfissionalQ,
      ]);

    const a = (agregado.rows?.[0] ?? {}) as Record<string, unknown>;
    const faltasTotal = num(a.faltas);
    const baseFalta = num(a.base_falta);

    return c.json({
      data: {
        taxaFalta: {
          valor: baseFalta > 0 ? Number(((faltasTotal / baseFalta) * 100).toFixed(1)) : 0,
          faltas: faltasTotal,
          base: baseFalta,
          lista: faltas?.rows,
        },
        pacientesComAtendimento: { valor: num(a.com_atendimento) },
        comProximaSessao: { valor: num(a.com_proxima), lista: proxima?.rows },
        ativosSemProximaSessao: {
          valor: num(a.ativos_sem_proxima),
          lista: ativosSemProxima?.rows,
        },
        riscoAbandono: { valor: num(a.risco_abandono), lista: risco?.rows },
        intervaloMedioSessoesDias: {
          valor: a.intervalo_medio === null ? null : Number(num(a.intervalo_medio).toFixed(1)),
        },
        pacientesAtivos30d: { valor: num(a.ativos_30d), lista: ativos30?.rows },
        sessoes30d: { valor: num(a.sessoes_30d) },
        volumePorProfissional: { lista: volume?.rows },
      },
      meta: {
        paginacao: { limit: pag.limit, offset: pag.offset, includeList: pag.includeList },
        criterios: {
          taxaFalta: `${STATUS_FALTA.join(", ")} sobre atendido + faltas (cancelado e remarcar excluídos dos dois lados)`,
          ativo: `atendido nos últimos ${JANELA_ATIVO_DIAS} dias`,
          riscoAbandono: `último atendimento entre ${RISCO_ABANDONO_MIN_DIAS} e ${RISCO_ABANDONO_MAX_DIAS} dias atrás, sem retorno marcado`,
          intervaloMedio: `gaps entre sessões de 1 a ${GAP_MAX_DIAS} dias; acima disso é interrupção, não cadência`,
          coorte:
            "admissão é a data da primeira sessão — patients.created_at é a data da migração para todos os pacientes e não serve de coorte",
        },
        // Documentado na resposta de propósito: quem consumir a API precisa saber
        // que a ausência desse recorte é decisão, não esquecimento.
        naoDisponivel: {
          taxaFaltaPorProfissional:
            "indisponível por viés conhecido: a autoria histórica veio da assinatura da evolução e falta não gera evolução (94,6% das faltas sem autor)",
        },
      },
    });
  } catch (error: any) {
    console.error("[Analytics/Operational] erro:", error);
    return c.json({ error: "Falha ao calcular indicadores operacionais", details: error.message }, 500);
  }
});

export default app;
