/**
 * Filtros de pendência da lista de pacientes.
 *
 * Why este módulo existe separado das rotas: o painel de pendências mostra uma
 * contagem e a lista devolve linhas. Se os dois lados escreverem o próprio SQL,
 * eles divergem na primeira manutenção — e um tile que diz "334" abrindo uma
 * lista de 351 destrói a confiança no painel inteiro, inclusive nos números que
 * estavam certos. Aqui cada pendência é UM predicado, usado literalmente pela
 * contagem e pelo filtro.
 *
 * Cada predicado é uma expressão booleana SQL parametrizada pela expressão que
 * identifica o paciente (`directory.id` na listagem, `p.id` na contagem) e pelo
 * placeholder da organização. Nenhum predicado consome parâmetro posicional
 * novo: todos reusam o `$1` do org, então podem ser injetados em qualquer ponto
 * da montagem de WHERE sem renumerar nada.
 *
 * Os critérios são os mesmos já publicados em `meta.criterios` de
 * `/api/analytics/record-quality` e `/api/analytics/operational` — a fonte dos
 * números continua sendo a mesma; o que muda é que agora dá para filtrar por eles.
 */

/** Piso de caracteres clínicos para uma avaliação contar como preenchida. */
const AVALIACAO_MIN_CHARS = 40;

/** Proporção de sessões com exercício prescrito que caracteriza reabilitação. */
const PROPORCAO_EXERCICIO_REABILITACAO = 0.25;

/** Dias sem atendimento para o paciente deixar de contar como ativo. */
const JANELA_ATIVO_DIAS = 60;

/** Inatividade mínima para o paciente entrar na fila de confirmação de alta. */
const CANDIDATO_ALTA_MIN_DIAS = 90;

/** Sessões consecutivas com a mesma conduta para caracterizar repetição. */
const PLATO_MIN_SESSOES = 4;

/** MCID da dor na EVA (Salaffi et al. 2004): abaixo disso é ruído de medição. */
const PLATO_PAIN_MCID = 1;

/** Chaves de agenda/UI que o importador trouxe e não são achado clínico. */
const CHAVES_NAO_CLINICAS =
  "ARRAY['date','start','end','appointment_id','btn_submit_appointment'," +
  "'convênio:*','encaminhamento profissional:','diabetes-has'," +
  "'observações do agendamento:','frequência','frequência:']::text[]";

/** Boilerplate da migração ZenFisio, reconhecido pelo texto e não pelo formulário. */
const REGEX_BOILERPLATE_IMPORT =
  "'(Paciente ZenFisio:|Appointment MoocaFisio:|Origem: appointment histórico|" +
  "sem conteúdo clínico|Navegação principal)'";

/** Status de agenda futura ainda válida — o paciente tem retorno marcado. */
const STATUS_FUTURO = "ARRAY['agendado','presenca_confirmada','avaliacao']::text[]";

export type PatientPendingFilterKey =
  | "semTelefone"
  | "semAvaliacaoEmReabilitacao"
  | "atendimentoSemEvolucao"
  | "ativoSemProximaSessao"
  | "candidatoAlta"
  | "platoConfirmado";

export interface PatientPendingFilter {
  key: PatientPendingFilterKey;
  /** Rótulo exibido no tile. PT-BR, sem jargão de banco. */
  label: string;
  /**
   * Critério em texto, exibido junto do número. Não é documentação: um filtro
   * clínico sem critério visível é lido como opinião do sistema e ignorado.
   */
  criterio: string;
  /**
   * Predicado SQL. `idExpr` é a expressão que resolve para `patients.id` no
   * contexto de uso; `orgParam` é o placeholder posicional do organization_id.
   */
  predicate: (idExpr: string, orgParam: string) => string;
}

/**
 * Pacientes sem nenhuma avaliação com conteúdo, mas em programa de reabilitação.
 *
 * O recorte por exercício prescrito não é decoração: sem ele a fila mistura quem
 * vem só para liberação miofascial ou recovery — para esses não existe avaliação
 * a fazer, e listá-los produz centenas de pendências falsas que a equipe aprende
 * a ignorar.
 */
function semAvaliacaoEmReabilitacaoPredicate(idExpr: string, org: string): string {
  return `${idExpr} IN (
    WITH resposta_conteudo AS (
      SELECT r.id, r.patient_id,
             coalesce(sum(length(btrim(t.v))) FILTER (
               WHERE btrim(coalesce(t.v, '')) <> ''
                 AND lower(btrim(t.k)) <> ALL (${CHAVES_NAO_CLINICAS})
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
             count(*) FILTER (WHERE caracteres_clinicos >= ${AVALIACAO_MIN_CHARS}) AS com_conteudo
        FROM resposta_conteudo GROUP BY patient_id
    ),
    paciente_sessoes AS (
      SELECT s.patient_id, count(*) AS sessoes
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
    )
    SELECT ps.patient_id
      FROM paciente_sessoes ps
      LEFT JOIN paciente_avaliacao pa ON pa.patient_id = ps.patient_id
      LEFT JOIN paciente_exercicio pe ON pe.patient_id = ps.patient_id
     WHERE coalesce(pa.com_conteudo, 0) = 0
       AND coalesce(pe.sessoes_com_exercicio, 0)::numeric / ps.sessoes
           >= ${PROPORCAO_EXERCICIO_REABILITACAO}
  )`;
}

/**
 * Platô confirmado: conduta repetida E confirmada por outro eixo (carga ou dor).
 *
 * Só repetição de conduta produziu 51% de falso positivo em produção — o paciente
 * estava progredindo carga dentro da mesma conduta, que é o comportamento correto.
 *
 * Diferença deliberada em relação a `detectPlateaus`: lá o `LIMIT` é aplicado
 * antes da classificação em JS, então o total do relatório depende da paginação.
 * Como filtro isso seria um bug — a contagem tem que ser da base inteira.
 */
function platoConfirmadoPredicate(idExpr: string, org: string): string {
  return `${idExpr} IN (
    WITH assinatura AS (
      SELECT s.id, s.patient_id, s.date,
             string_agg(DISTINCT ce.code, ',' ORDER BY ce.code) AS sig
        FROM sessions s
        JOIN clinical_extractions ce
          ON ce.source_id = s.id
         AND ce.source_table = 'sessions'
         AND ce.category IN ('conduta', 'regiao')
         AND ce.rejected = false
       WHERE s.organization_id = ${org}::uuid AND s.deleted_at IS NULL
       GROUP BY s.id, s.patient_id, s.date
    ),
    ilhas AS (
      SELECT patient_id, date, sig, id,
             row_number() OVER (PARTITION BY patient_id ORDER BY date)
           - row_number() OVER (PARTITION BY patient_id, sig ORDER BY date) AS grp
        FROM assinatura
    ),
    sequencias AS (
      SELECT patient_id, array_agg(id) AS session_ids
        FROM ilhas
       GROUP BY patient_id, sig, grp
      HAVING count(*) >= ${PLATO_MIN_SESSOES}
    ),
    metricas AS (
      SELECT q.patient_id,
        (SELECT count(DISTINCT ce.value_numeric) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'carga'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS cargas_distintas,
        (SELECT count(*) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'carga'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS cargas_total,
        (SELECT max(ce.value_numeric) - min(ce.value_numeric) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'eva'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS amplitude_dor,
        (SELECT count(*) FROM clinical_extractions ce
          WHERE ce.source_id = ANY(q.session_ids) AND ce.category = 'eva'
            AND ce.source_table = 'sessions'
            AND ce.rejected = false) AS leituras_dor
        FROM sequencias q
    )
    SELECT DISTINCT patient_id FROM metricas
     WHERE (CASE WHEN cargas_total >= 2 AND cargas_distintas <= 1 THEN 1 ELSE 0 END
          + CASE WHEN leituras_dor >= 2 AND amplitude_dor < ${PLATO_PAIN_MCID} THEN 1 ELSE 0 END) >= 1
  )`;
}

export const PATIENT_PENDING_FILTERS: Record<PatientPendingFilterKey, PatientPendingFilter> = {
  semTelefone: {
    key: "semTelefone",
    label: "Sem telefone",
    criterio:
      "phone nulo ou vazio — bloqueia lembrete, confirmação e reativação por WhatsApp",
    predicate: (id, org) =>
      `${id} IN (SELECT x.id FROM patients x
         WHERE x.organization_id = ${org}::uuid
           AND (x.phone IS NULL OR btrim(x.phone) = ''))`,
  },
  semAvaliacaoEmReabilitacao: {
    key: "semAvaliacaoEmReabilitacao",
    label: "Em reabilitação, sem avaliação",
    criterio:
      `paciente com exercício prescrito em ao menos ` +
      `${Math.round(PROPORCAO_EXERCICIO_REABILITACAO * 100)}% das sessões e sem nenhuma avaliação ` +
      `com ${AVALIACAO_MIN_CHARS}+ caracteres clínicos. Terapia manual avulsa não entra: ` +
      `para esse perfil não existe avaliação a fazer`,
    predicate: semAvaliacaoEmReabilitacaoPredicate,
  },
  atendimentoSemEvolucao: {
    key: "atendimentoSemEvolucao",
    label: "Com atendimento sem evolução",
    criterio:
      "paciente com ao menos um agendamento 'atendido' sem evolução escrita para aquela data. " +
      "Conta PACIENTES, não atendimentos — o total de atendimentos em aberto é maior",
    /**
     * Mesmo critério do badge `sem_evolucao` da agenda (`appointmentPendencies.ts`),
     * e não por acaso: são o mesmo conceito visto em duas telas, e divergir aqui
     * faria a lista dizer um número e a agenda outro.
     *
     * Casa a sessão por `appointment_id` OU por paciente+data porque a base
     * importada não tem `appointment_id` — só pelo vínculo direto, 52 pacientes
     * apareciam como pendentes tendo a evolução escrita. Observação em branco
     * conta como não escrita: existir a linha não é ter registro clínico.
     */
    predicate: (id, org) =>
      `${id} IN (SELECT a.patient_id FROM appointments a
         WHERE a.organization_id = ${org}::uuid
           AND a.deleted_at IS NULL
           AND a.status = 'atendido'
           AND a.patient_id IS NOT NULL
           AND NOT EXISTS (
             SELECT 1 FROM sessions s
              WHERE s.organization_id = ${org}::uuid
                AND s.deleted_at IS NULL
                AND (s.appointment_id = a.id
                     OR (s.patient_id = a.patient_id AND s.date::date = a.date))
                AND coalesce(btrim(s.observacao), '') <> ''))`,
  },
  ativoSemProximaSessao: {
    key: "ativoSemProximaSessao",
    label: "Ativo sem próxima sessão",
    criterio:
      `atendido nos últimos ${JANELA_ATIVO_DIAS} dias e sem nenhum agendamento futuro ` +
      `em status agendado, presença confirmada ou avaliação`,
    predicate: (id, org) =>
      `${id} IN (
         SELECT u.patient_id FROM (
           SELECT a.patient_id, max(a.date) AS ultima
             FROM appointments a
            WHERE a.organization_id = ${org}::uuid
              AND a.deleted_at IS NULL
              AND a.status = 'atendido'
            GROUP BY a.patient_id
         ) u
         WHERE u.ultima >= CURRENT_DATE - ${JANELA_ATIVO_DIAS}
           AND NOT EXISTS (
             SELECT 1 FROM appointments f
              WHERE f.organization_id = ${org}::uuid
                AND f.deleted_at IS NULL
                AND f.patient_id = u.patient_id
                AND f.status = ANY(${STATUS_FUTURO})
                AND f.date >= CURRENT_DATE))`,
  },
  candidatoAlta: {
    key: "candidatoAlta",
    label: "Candidato a alta",
    criterio:
      `sem sessão há mais de ${CANDIDATO_ALTA_MIN_DIAS} dias, sem retorno marcado e sem alta ` +
      `já registrada. É fila de confirmação por telefone — ninguém aqui recebeu alta`,
    predicate: (id, org) =>
      `${id} IN (
         SELECT u.patient_id FROM (
           SELECT s.patient_id, max(s.date) AS ultima
             FROM sessions s
            WHERE s.organization_id = ${org}::uuid AND s.deleted_at IS NULL
            GROUP BY s.patient_id
         ) u
         WHERE u.ultima < CURRENT_DATE - ${CANDIDATO_ALTA_MIN_DIAS}
           AND NOT EXISTS (
             SELECT 1 FROM appointments f
              WHERE f.organization_id = ${org}::uuid
                AND f.patient_id = u.patient_id
                AND f.date > CURRENT_DATE
                AND f.status IN ('agendado', 'presenca_confirmada'))
           AND NOT EXISTS (
             SELECT 1 FROM discharge_events d
              WHERE d.organization_id = ${org}::uuid AND d.patient_id = u.patient_id))`,
  },
  platoConfirmado: {
    key: "platoConfirmado",
    label: "Platô confirmado",
    criterio:
      `${PLATO_MIN_SESSOES} sessões consecutivas com a mesma conduta e região, confirmadas por ` +
      `carga sem variação ou dor variando menos de ${PLATO_PAIN_MCID} ponto na EVA (MCID). ` +
      `Repetição de conduta sozinha não conta: gerou 51% de falso positivo`,
    predicate: platoConfirmadoPredicate,
  },
};

export const PATIENT_PENDING_FILTER_KEYS = Object.keys(
  PATIENT_PENDING_FILTERS,
) as PatientPendingFilterKey[];

export function isPatientPendingFilterKey(value: unknown): value is PatientPendingFilterKey {
  return typeof value === "string" && value in PATIENT_PENDING_FILTERS;
}

/**
 * Cláusula WHERE do filtro, para a listagem.
 *
 * `idExpr` é `directory.id` porque a listagem filtra sobre a CTE já montada.
 */
export function patientPendingFilterClause(
  key: PatientPendingFilterKey,
  idExpr: string,
  orgParam = "$1",
): string {
  return PATIENT_PENDING_FILTERS[key].predicate(idExpr, orgParam);
}

/**
 * Consulta de contagem de todas as pendências.
 *
 * A base (`organization_id` + não arquivado) é literalmente a mesma da CTE
 * `directory_rows` da listagem, e cada `FILTER` usa o mesmo `predicate` que o
 * filtro aplica. Não existe caminho em que os dois números divirjam sem que este
 * arquivo mude.
 */
export function buildPatientPendingCountsSql(orgParam = "$1"): string {
  const filters = PATIENT_PENDING_FILTER_KEYS.map(
    (key) =>
      `count(*) FILTER (WHERE ${PATIENT_PENDING_FILTERS[key].predicate("p.id", orgParam)})::int AS "${key}"`,
  ).join(",\n      ");

  return `
    SELECT
      count(*)::int AS "total",
      ${filters}
    FROM patients p
    WHERE p.organization_id = ${orgParam}::uuid
      AND COALESCE(p.archived, FALSE) = FALSE
  `;
}
