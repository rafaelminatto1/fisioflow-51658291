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

/**
 * Piso de caracteres clínicos para uma avaliação contar como preenchida.
 *
 * Why: metade das linhas de `patient_evaluation_responses` (538 de 1.066) são
 * cascas da migração ZenFisio — só carregam o bloco de metadados do importador
 * ("Paciente ZenFisio: 5323484 / Tipo original: Avaliação"), a frase-carimbo
 * "importada ... sem conteúdo clínico" ou, em um caso, o menu de navegação que
 * o scraper capturou. Contar "existe linha" como "paciente foi avaliado" fazia
 * o indicador reportar 334 pendências onde há 351.
 *
 * 40 caracteres é aproximadamente uma frase clínica curta ("Dorsiflexao flexão
 * plantar inversao eversao" tem 43). Abaixo disso não há achado que sustente
 * conduta. O corte é estável: entre 20 e 80 caracteres o número de avaliações
 * com conteúdo varia apenas de 531 para 526, e o de pacientes não se move.
 */
const AVALIACAO_MIN_CHARS = 40;

/**
 * Chaves que existem no formulário mas não são achado clínico.
 *
 * São campos de agenda/UI que o importador trouxe junto (horário, convênio,
 * botão de submit) e a observação administrativa do agendamento. Deixá-los
 * contar transformaria "particular, 1x na semana" em avaliação preenchida.
 *
 * Comparação em minúsculas porque o corpus tem a mesma seção com e sem
 * dois-pontos e com caixa alternada ("Palpação" e "Palpação:").
 */
const CHAVES_NAO_CLINICAS = [
  "date",
  "start",
  "end",
  "appointment_id",
  "btn_submit_appointment",
  "convênio:*",
  "encaminhamento profissional:",
  "diabetes-has",
  "observações do agendamento:",
  "frequência",
  "frequência:",
];

/**
 * Boilerplate do importador, reconhecido pelo texto e não pelo formulário.
 *
 * DELIBERADO: não filtramos por `evaluation_forms.nome`. As cascas estão quase
 * todas no formulário "ZenFisio - Anamnese importada", mas duas avaliações reais
 * também estão lá, e — mais importante — qualquer avaliação nova criada no app
 * usa outro formulário e passaria a ser classificada por um critério que não a
 * descreve. O critério tem que ser sobre o conteúdo, não sobre a origem.
 */
const REGEX_BOILERPLATE_IMPORT =
  "(Paciente ZenFisio:|Appointment MoocaFisio:|Origem: appointment histórico|sem conteúdo clínico|Navegação principal)";

/**
 * Proporção mínima de sessões com exercício prescrito para o paciente contar
 * como "em programa de reabilitação".
 *
 * Why (informação do dono da clínica, jul/2026): a ausência de avaliação não é,
 * na maioria dos casos, falha de prontuário. Boa parte dos pacientes vem só para
 * liberação miofascial ou recovery — atendimento avulso de terapia manual, sem
 * programa de reabilitação. Para esses não existe avaliação a fazer, e listá-los
 * como pendência produz uma fila enorme e falsa, que a equipe aprende a ignorar.
 *
 * O corte por exercício prescrito é o proxy objetivo do modelo de atendimento, e
 * o corpus confirma que separa: entre os pacientes sem avaliação com conteúdo,
 * 50,1% nunca tiveram exercício prescrito; entre os avaliados, 7,6% — 6,6x de
 * diferença. Sem exercício prescrito não há programa de reabilitação.
 *
 * 25% e não "alguma vez": uma prescrição isolada em 40 sessões de massagem é
 * ruído do parser ou uma orientação pontual, não um programa.
 */
const PROPORCAO_EXERCICIO_REABILITACAO = 0.25;

/** Segmentos de avaliação que aceitam lista paginada. */
const SEGMENTOS_AVALIACAO = [
  "semAvaliacaoEmReabilitacao",
  "terapiaManualAvulsa",
  "avaliacoesComRegistroVazio",
] as const;
type SegmentoAvaliacao = (typeof SEGMENTOS_AVALIACAO)[number];

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
      WITH resposta_conteudo AS (
        -- Soma o texto clínico de cada avaliação. Os dois formatos de
        -- \`responses\` convivem no corpus: a avaliação completa guarda os
        -- campos sob "fields", a anamnese importada guarda o mapa no topo com
        -- chaves que são o UUID do campo. LEFT JOIN LATERAL para que um
        -- \`responses\` vazio ({}) continue existindo como registro vazio.
        SELECT r.id, r.patient_id,
               coalesce(sum(length(btrim(t.v))) FILTER (
                 WHERE btrim(coalesce(t.v, '')) <> ''
                   AND lower(btrim(t.k)) <> ALL (${CHAVES_NAO_CLINICAS}::text[])
                   AND t.v !~ ${REGEX_BOILERPLATE_IMPORT}
               ), 0) AS caracteres_clinicos
          FROM patient_evaluation_responses r
          LEFT JOIN LATERAL jsonb_each_text(
            CASE WHEN jsonb_typeof(r.responses->'fields') = 'object'
                 THEN r.responses->'fields' ELSE r.responses END
          ) AS t(k, v) ON true
         WHERE r.organization_id = ${org}::uuid
         GROUP BY r.id, r.patient_id
      ),
      paciente_avaliacao AS (
        SELECT patient_id,
               count(*) AS registros,
               count(*) FILTER (WHERE caracteres_clinicos >= ${AVALIACAO_MIN_CHARS}::int) AS com_conteudo
          FROM resposta_conteudo
         GROUP BY patient_id
      ),
      paciente_sessoes AS (
        SELECT s.patient_id, count(*) AS sessoes
          FROM sessions s
         WHERE s.organization_id = ${org}::uuid AND s.deleted_at IS NULL
         GROUP BY s.patient_id
      ),
      paciente_exercicio AS (
        -- Sinal do modelo de atendimento: em quantas evoluções houve exercício
        -- prescrito. Vem do parser clínico já materializado, não de nova leitura
        -- do texto livre.
        SELECT e.patient_id, count(DISTINCT e.source_id) AS sessoes_com_exercicio
          FROM clinical_extractions e
         WHERE e.organization_id = ${org}::uuid
           AND e.rejected = false
           AND e.source_table = 'sessions'
           AND e.category = 'exercicio'
         GROUP BY e.patient_id
      ),
      perfil AS (
        SELECT p.id AS patient_id,
               ps.sessoes,
               coalesce(pa.registros, 0) AS registros,
               coalesce(pa.com_conteudo, 0) AS registros_com_conteudo,
               coalesce(pe.sessoes_com_exercicio, 0)::numeric / ps.sessoes AS proporcao_exercicio
          FROM patients p
          JOIN paciente_sessoes ps ON ps.patient_id = p.id
          LEFT JOIN paciente_avaliacao pa ON pa.patient_id = p.id
          LEFT JOIN paciente_exercicio pe ON pe.patient_id = p.id
         WHERE p.organization_id = ${org}::uuid
      )
      SELECT
        (SELECT count(*) FROM perfil) AS pacientes_com_sessao,
        (SELECT count(*) FROM perfil
          WHERE registros_com_conteudo = 0
            AND proporcao_exercicio >= ${PROPORCAO_EXERCICIO_REABILITACAO}::numeric) AS sem_avaliacao_reabilitacao,
        (SELECT count(*) FROM perfil
          WHERE proporcao_exercicio < ${PROPORCAO_EXERCICIO_REABILITACAO}::numeric) AS terapia_manual_avulsa,
        (SELECT count(*) FROM perfil
          WHERE registros_com_conteudo = 0
            AND proporcao_exercicio < ${PROPORCAO_EXERCICIO_REABILITACAO}::numeric) AS terapia_manual_sem_avaliacao,
        (SELECT count(*) FROM perfil WHERE registros_com_conteudo = 0) AS sem_avaliacao_util,
        (SELECT count(*) FROM perfil WHERE registros = 0) AS sem_nenhum_registro,
        (SELECT count(*) FROM perfil
          WHERE registros > 0 AND registros_com_conteudo = 0) AS pacientes_registro_vazio,
        (SELECT count(*) FROM resposta_conteudo
          WHERE caracteres_clinicos < ${AVALIACAO_MIN_CHARS}::int) AS registros_vazios,
        (SELECT count(*) FROM resposta_conteudo) AS registros_avaliacao,
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

    /**
     * Lista paginada de um segmento de avaliação.
     *
     * Uma função só, parametrizada pelo segmento, em vez de três consultas
     * quase idênticas: o CTE de classificação é longo e duplicá-lo é a receita
     * para os três números divergirem na primeira manutenção.
     */
    const listaSegmento = (segmento: SegmentoAvaliacao) => sql`
      WITH resposta_conteudo AS (
        SELECT r.id, r.patient_id,
               coalesce(sum(length(btrim(t.v))) FILTER (
                 WHERE btrim(coalesce(t.v, '')) <> ''
                   AND lower(btrim(t.k)) <> ALL (${CHAVES_NAO_CLINICAS}::text[])
                   AND t.v !~ ${REGEX_BOILERPLATE_IMPORT}
               ), 0) AS caracteres_clinicos
          FROM patient_evaluation_responses r
          LEFT JOIN LATERAL jsonb_each_text(
            CASE WHEN jsonb_typeof(r.responses->'fields') = 'object'
                 THEN r.responses->'fields' ELSE r.responses END
          ) AS t(k, v) ON true
         WHERE r.organization_id = ${org}::uuid
         GROUP BY r.id, r.patient_id
      ),
      paciente_avaliacao AS (
        SELECT patient_id,
               count(*) AS registros,
               count(*) FILTER (WHERE caracteres_clinicos >= ${AVALIACAO_MIN_CHARS}::int) AS com_conteudo
          FROM resposta_conteudo
         GROUP BY patient_id
      ),
      paciente_sessoes AS (
        SELECT s.patient_id, count(*) AS sessoes,
               min(s.date) AS primeira_sessao, max(s.date) AS ultima_sessao
          FROM sessions s
         WHERE s.organization_id = ${org}::uuid AND s.deleted_at IS NULL
         GROUP BY s.patient_id
      ),
      paciente_exercicio AS (
        SELECT e.patient_id, count(DISTINCT e.source_id) AS sessoes_com_exercicio
          FROM clinical_extractions e
         WHERE e.organization_id = ${org}::uuid
           AND e.rejected = false
           AND e.source_table = 'sessions'
           AND e.category = 'exercicio'
         GROUP BY e.patient_id
      ),
      perfil AS (
        SELECT p.id AS patient_id, p.full_name, p.phone,
               ps.sessoes, ps.primeira_sessao, ps.ultima_sessao,
               coalesce(pa.registros, 0) AS registros,
               coalesce(pa.com_conteudo, 0) AS registros_com_conteudo,
               coalesce(pe.sessoes_com_exercicio, 0) AS sessoes_com_exercicio,
               coalesce(pe.sessoes_com_exercicio, 0)::numeric / ps.sessoes AS proporcao_exercicio
          FROM patients p
          JOIN paciente_sessoes ps ON ps.patient_id = p.id
          LEFT JOIN paciente_avaliacao pa ON pa.patient_id = p.id
          LEFT JOIN paciente_exercicio pe ON pe.patient_id = p.id
         WHERE p.organization_id = ${org}::uuid
      )
      SELECT patient_id AS "patientId", full_name AS "patientName", phone,
             sessoes AS "sessoes",
             sessoes_com_exercicio AS "sessoesComExercicio",
             round(proporcao_exercicio, 3) AS "proporcaoExercicio",
             registros AS "registrosAvaliacao",
             registros_com_conteudo AS "registrosComConteudo",
             primeira_sessao AS "primeiraSessao",
             ultima_sessao AS "ultimaSessao"
        FROM perfil
       WHERE CASE ${segmento}::text
               WHEN 'semAvaliacaoEmReabilitacao'
                 THEN registros_com_conteudo = 0
                  AND proporcao_exercicio >= ${PROPORCAO_EXERCICIO_REABILITACAO}::numeric
               WHEN 'terapiaManualAvulsa'
                 THEN proporcao_exercicio < ${PROPORCAO_EXERCICIO_REABILITACAO}::numeric
               WHEN 'avaliacoesComRegistroVazio'
                 THEN registros > 0 AND registros_com_conteudo = 0
               ELSE false
             END
       ORDER BY ultima_sessao DESC
       LIMIT ${pag.limit} OFFSET ${pag.offset}
    `;

    const listasSegmento = SEGMENTOS_AVALIACAO.map((s) =>
      querListaDe(pag, s) ? listaSegmento(s) : null,
    );

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

    const [agregado, semSessao, listaReab, listaAvulsa, listaVazio, semTelefone, obsCurta] =
      await Promise.all([
        agregadoQ,
        listaSemSessaoQ,
        listasSegmento[0],
        listasSegmento[1],
        listasSegmento[2],
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
        pacientesComSessao: { valor: num(a.pacientes_com_sessao) },
        // ÚNICO indicador acionável do bloco de avaliação: paciente em programa
        // de reabilitação (exercício prescrito em parte relevante das sessões)
        // e sem nenhuma avaliação com conteúdo clínico.
        semAvaliacaoEmReabilitacao: {
          valor: num(a.sem_avaliacao_reabilitacao),
          lista: listaReab?.rows,
        },
        // Informativo, NÃO é pendência: o modelo de atendimento explica a
        // ausência de avaliação. Exposto para que ninguém volte a somar os dois.
        terapiaManualAvulsa: {
          valor: num(a.terapia_manual_avulsa),
          semAvaliacao: num(a.terapia_manual_sem_avaliacao),
          lista: listaAvulsa?.rows,
        },
        // "Tem registro mas está vazio" pede ação diferente de "nunca avaliado":
        // aqui existe uma linha que a interface mostra como avaliação existente,
        // escondendo a lacuna de quem abre o prontuário.
        avaliacoesComRegistroVazio: {
          valor: num(a.pacientes_registro_vazio),
          registros: num(a.registros_vazios),
          registrosTotais: num(a.registros_avaliacao),
          lista: listaVazio?.rows,
        },
        pacientesSemNenhumRegistroAvaliacao: { valor: num(a.sem_nenhum_registro) },
        pacientesSemAvaliacaoComConteudo: { valor: num(a.sem_avaliacao_util) },
        pacientesSemTelefone: { valor: num(a.sem_telefone), lista: semTelefone?.rows },
        sessoesObservacaoCurta: { valor: num(a.observacao_curta), lista: obsCurta?.rows },
      },
      meta: {
        paginacao: { limit: pag.limit, offset: pag.offset, includeList: pag.includeList },
        criterios: {
          agendamentosSemSessao:
            "appointment com status 'atendido' sem nenhuma sessão ativa apontando para ele",
          recentes: `últimos ${JANELA_RECENTE_DIAS} dias`,
          avaliacaoComConteudo:
            `avaliação conta como preenchida quando a soma dos campos clínicos tem ao menos ` +
            `${AVALIACAO_MIN_CHARS} caracteres, descartando campos de agenda/UI e o boilerplate ` +
            `da importação ZenFisio. O critério é sobre o texto, nunca sobre o formulário de origem`,
          semAvaliacaoEmReabilitacao:
            `paciente com exercício prescrito em ao menos ${Math.round(PROPORCAO_EXERCICIO_REABILITACAO * 100)}% ` +
            `das sessões e sem nenhuma avaliação com conteúdo — é a fila de trabalho`,
          terapiaManualAvulsa:
            `paciente com exercício prescrito em menos de ${Math.round(PROPORCAO_EXERCICIO_REABILITACAO * 100)}% ` +
            `das sessões: perfil de terapia manual/recovery avulso, sem programa de reabilitação. ` +
            `Não é pendência de prontuário — não existe avaliação a fazer`,
          avaliacoesComRegistroVazio:
            "existe linha em patient_evaluation_responses sem conteúdo clínico (casca da migração)",
          pacientesSemNenhumRegistroAvaliacao:
            "nenhuma linha em patient_evaluation_responses — diferente de ter registro vazio",
          sessoesObservacaoCurta: `observacao com menos de ${OBSERVACAO_MIN_CHARS} caracteres úteis`,
          pacientesSemTelefone:
            "phone nulo ou vazio — bloqueia lembrete, confirmação e reativação por WhatsApp",
        },
        decisoes: {
          conteudoDeAvaliacao:
            "o sinal de conteúdo é medido no próprio texto da avaliação, não pela existência " +
            "de linha em clinical_extractions. Usar a extração seria circular na direção errada: " +
            "uma avaliação recém-escrita no app ficaria contada como vazia até o parser rodar, e " +
            "uma pausa no backfill inflaria a fila de pendências sem que nada tivesse piorado. " +
            "A extração foi usada como validação independente do critério — os dois métodos " +
            "concordam em 351 pacientes sem avaliação útil (divergem em 1 paciente no total da base)",
          ausenciaNemSempreEFalha:
            "ausência de avaliação só vira pendência quando o modelo de atendimento pede avaliação; " +
            "para terapia manual avulsa não existe avaliação a fazer",
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
