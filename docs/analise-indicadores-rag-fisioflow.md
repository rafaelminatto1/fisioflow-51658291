# FisioFlow/MoocaFisio — Análise de frontend, backend, indicadores e RAG

> Resposta ao `docs/prompt-claude-code-melhorias-front-back-indicadores-rag.md`.
> Toda afirmação numérica foi medida no banco de produção `purple-union-72678311` em **30/07/2026**. As queries estão no Apêndice A.
> Todo caminho de arquivo citado foi verificado como existente no repositório.

---

## 1. Visão geral estratégica

O prompt parte da premissa de que precisamos **construir** inteligência sobre os dados migrados. A inspeção do código e do banco mostra o oposto: quase tudo já foi construído — e quase nada está funcionando. O sistema tem 100+ rotas de API, 13 abas no perfil do paciente, 4 widgets de IA renderizados na visão geral, uma tabela de embeddings com índice HNSW e um endpoint de RAG clínico. E, ao mesmo tempo:

- `clinical_embeddings` tem **0 linhas**;
- `patient_session_metrics`, `patient_goals`, `pain_maps`, `standardized_test_results` têm **0 linhas**;
- `medical_records` tem 534 linhas com `chief_complaint`, `diagnosis` e `icd10_codes` **100% vazios**;
- `sessions.pain_scale` está preenchido em **49 de 11.346** evoluções;
- **997 de 1.022** pacientes estão sem telefone;
- ~~toda a autoria clínica apontava para um único usuário~~ — **corrigido em 30/07/2026, ver §1.1**;
- o RAG clínico retornava **contexto fictício hardcoded** — código morto, removido em 31/07 (§1.4).

A tese desta análise é portanto **consertar antes de expandir**. Nenhuma tela nova, nenhum dashboard novo, nenhuma tabela nova enquanto as existentes estiverem vazias. Três frentes, nesta ordem:

**Frente A — parar de mentir.** Remover o stub de RAG que inventa contexto clínico e distinguir, na tela, dado ausente de dado zero. Um prontuário que apresenta dado inventado — ou um EVA não preenchido exibido como "0/10 · Sem dor" — é risco clínico, não bug de UX. *(Concluída em 31/07 — §1.4.)*

**Frente B — colher o que já é calculável.** Os indicadores **operacionais** não dependem de IA nem de extração: são `GROUP BY` sobre 14.603 agendamentos. Eles já apontam problemas concretos e caros (20,9% de faltas; 146 pacientes ativos sem próxima sessão; 902 atendimentos sem evolução). Isso é a Fase 1 inteira e não precisa de nenhuma tecnologia nova.

**Frente C — destravar o texto.** O valor clínico do sistema está em **11.336 evoluções em texto livre** e **531 avaliações ZenFisio**, hoje inacessíveis a qualquer consulta. Duas saídas complementares: parser determinístico (o texto é muito mais estruturado do que parece — ver §7.2) e RAG por paciente com pgvector.

**O que explicitamente não fazer agora:**

| Não fazer | Por quê |
|---|---|
| Página nova de Indicadores/Gestão | Já existe `src/pages/analytics/` e `src/pages/CohortAnalysis.tsx`. Criar mais uma superfície vazia repete o erro. |
| Cloudflare Vectorize | pgvector já está provisionado com HNSW. Filtro por paciente vira `WHERE`, o que é a defesa mais forte contra vazamento cross-patient. Ver §7.6. |
| Ranking de desempenho entre profissionais | Há **9 fisioterapeutas** reais (corrigido em 30/07 — ver §1.1), mas os volumes são muito assimétricos (Amanda Notoya 52%, Millena 2 sessões). Volume por profissional: sim. Ranking de qualidade: não. |
| Campanhas de CRM por inatividade | Só **25 de 1.022** pacientes têm telefone. O gargalo é cadastro, não automação. |
| Inferir EVA a partir de descrição qualitativa | Converter "muita dor muscular" num número seria fabricar dado clínico. **Mas** 466 evoluções trazem EVA numérica explícita no texto e essas são extraíveis (§1.5). |

### 1.1 Correção aplicada em 30/07/2026 — autoria clínica

Durante esta análise foi constatado que **11.333 das 11.346 sessões estavam atribuídas a um único usuário** (o do Rafael), e ainda usando a chave errada: `sessions.therapist_id` recebeu `profiles.id` em vez de `profiles.user_id`, que é a chave usada pelos joins do sistema (`LEFT JOIN profiles p ON p.user_id = a.therapist_id::text`, em `routes/appointments.ts`, `cron.ts`, `staffSchedules.ts`). Consequência: nenhuma tela conseguia exibir o autor de nenhuma evolução.

A autoria real existia apenas dentro do texto, na assinatura `(Nome CREFITO 3/XXXXXX-F)`, presente em **91,1%** das evoluções.

**O que foi feito:**

1. Criados 10 perfis de fisioterapeuta (`role='fisioterapeuta'`, `user_id = id`, sem conta de login, e-mails em domínio reservado `.invalid`).
2. Backup integral da coluna em `backup_sessions_therapist_20260730` (11.346 linhas).
3. Reatribuição de **9.616 sessões (84,8%)** pela assinatura CREFITO, com consolidação de 28 variantes de digitação (ex.: `4211067`, `461106`, `42116` → `3/421106-F`), cada variante validada contra o nome no mesmo texto.

**Distribuição real de autoria após a correção:**

| Fisioterapeuta | CREFITO | Sessões | Período |
|---|---|---:|---|
| Amanda Notoya | 3/215954-F | 5.871 | 11/2021 – 07/2026 |
| Isabella Colivati | 3/421106-F | 1.860 | 02/2025 – 06/2026 |
| Luiza Lopes | 3/232856-F | 787 | 07/2024 – 03/2025 |
| Gabriele Nunes | 3/450129-F | 425 | 03/2026 – 07/2026 |
| Lucas Gonçalves | 3/301732-F | 380 | 05/2024 – 12/2024 |
| Letícia França Freire | 3/446365-F | 147 | 02/2026 – 06/2026 |
| Fábio Takara | 3/277734-F | 140 | 05/2024 – 06/2024 |
| Rafael Minatto | — | 13 | 06/2026 – 07/2026 |
| Lucas Cavalcante Martins | 3/280406-F | 4 | 01/2025 |
| Millena | 3/321075-F | 2 | 11/2021 |
| *sem assinatura no texto* | — | 1.717 | — |

(Os mesmos volumes se repetem em `appointments`, exceto os 4.988 sem autor.)

Lucas Bulgarelli foi cadastrado a pedido, mas **não assina nenhuma sessão ou avaliação** — ficou sem CREFITO e sem histórico.

**Efeitos nesta análise:** indicadores por profissional deixam de ser inviáveis (eram n=2, hoje são 9). Continua vetado **ranking de qualidade**, porque os volumes são assimétricos e não há ajuste de case-mix — mas volume, carga e distribuição de condutas por profissional passam a ser legítimos.

`appointments` também foi corrigido (backup em `backup_appointments_therapist_20260730`), derivando o autor do vínculo `sessions.appointment_id`.

### 1.2 Segunda passada — o regex que perdia 716 sessões

A primeira extração usava `CREFITO[\s\-–]*[0-9]+\s*/\s*([0-9]+)`, que assume *região → separador → número*. Duas falhas:

- **`CREFITO/3 446365-F`** (separador antes da região) não casava. Isso sozinho escondia **329 sessões da Letícia França** — ela aparecia com 147 quando tem 476.
- **`CREFITO 301732-F`** (sem região) fazia o `3?` opcional comer o primeiro dígito e capturar `01732`.

Regex corrigido — a região só conta quando vem seguida de separador:

```regex
CREFITO[^0-9]{0,4}(?:3[/\s\-–\.]+)?([0-9]{4,7})
```

Resultado: **10.332 sessões atribuídas** (era 9.616) e órfãs de 1.717 → **1.001**. Ganhos: Luiza Lopes 787→1.046, Letícia 147→476, Isabella 1.860→1.913, Lucas Cavalcante 4→57. O mapa de variantes cresceu para 33 grafias, cada uma validada contra o nome no mesmo trecho. Cinco sessões sem número legível (`CREFITO-3)`, `CREFITO 3]215954-F`) foram resolvidas por nome.

**Distribuição final:**

| Fisioterapeuta | CREFITO | Sessões | Agendamentos |
|---|---|---:|---:|
| Amanda Notoya | 3/215954-F | 5.873 | 5.873 |
| Isabella Colivati | 3/421106-F | 1.913 | 1.913 |
| Luiza Lopes | 3/232856-F | 1.046 | 1.046 |
| Letícia França Freire | 3/446365-F | 476 | 476 |
| Gabriele Nunes | 3/450129-F | 425 | 425 |
| Lucas Gonçalves | 3/301732-F | 399 | 399 |
| Fábio Takara | 3/277734-F | 141 | 141 |
| Lucas Cavalcante Martins | 3/280406-F | 57 | 57 |
| Rafael Minatto | — | 13 | — |
| Millena | 3/321075-F | 2 | 2 |
| *sem autor* | — | 1.001 | 4.272 |

### 1.3 Por que os 4.272 sem autor não devem ser inferidos

Os agendamentos sem autor se dividem em: **2.865 faltas**, **1.281 atendidos**, 126 outros status. Os 1.281 atendidos vêm de duas origens: 902 sem evolução nenhuma e 380 com evolução que o fisioterapeuta não assinou.

Testei dois métodos de inferência.

**Exclusividade temporal — descartado.** A hipótese era: se num mês só um fisioterapeuta atuava, o órfão é dele. Não funciona — **nenhum mês da série teve um único profissional ativo** (mínimo de 2), e o dominante raramente passa de 75%. Erraria 1 em cada 4.

**Vizinhos concordantes — tecnicamente viável, estatisticamente enganoso.** Regra: se a sessão assinada anterior e a posterior do mesmo paciente são do mesmo profissional e ambas estão a ≤30 dias, atribui-se a ele. Cobertura: 1.332 das 2.865 faltas (46,5%) e 289 dos 1.281 atendidos (22,6%).

Simulei o resultado. É aqui que o método se revela ruim:

| Fisioterapeuta | Faltas | % de falta (simulado) |
|---|---:|---:|
| Amanda Notoya | 922 | 13,4% |
| Isabella Colivati | 257 | 11,7% |
| Luiza Lopes | 147 | 12,0% |
| Gabriele Nunes | 69 | 14,8% |
| Lucas Gonçalves | 57 | 12,4% |
| Letícia França Freire | 36 | 6,7% |
| Fábio Takara | 8 | 5,3% |
| Lucas Cavalcante Martins | 3 | 4,8% |
| **(ainda sem autor)** | **1.533** | **60,7%** |

Todo profissional fica entre 4,8% e 14,8%, enquanto a clínica real é **20,9%** — e o resíduo não atribuído concentra 60,7% de falta. Isso é **viés de seleção**, não coincidência: a inferência exige sessões assinadas vizinhas, que só existem para pacientes com histórico regular — justamente os que faltam menos.

Os dados confirmam o mecanismo:

| Perfil do paciente | Pacientes | % de falta | Agendamentos sem autor |
|---|---:|---:|---:|
| Nunca foi atendido | 132 | **100%** | 183 de 185 |
| 1–2 atendimentos | 279 | 33,0% | 313 de 496 |
| 3–10 atendimentos | 243 | 23,7% | 784 de 2.127 |
| 11+ atendimentos | 368 | 18,9% | 2.992 de 11.796 |

Quanto menos o paciente compareceu, maior sua taxa de falta e maior a chance de não ter autor — porque nunca gerou a evolução assinada que serviria de âncora. Inferir não corrigiria o viés: **disfarçaria**, fazendo todos os profissionais parecerem melhores do que a clínica inteira.

**Decisão: não inferir.** Os 4.272 permanecem sem autor. E a regra do §4.2 se mantém:

> **Taxa de falta é indicador da clínica, nunca por profissional.** Volume de atendimentos por profissional é confiável (veio de assinatura real). Falta por profissional não é, e não há como torná-la confiável com os dados existentes — só passando a registrar o profissional no agendamento daqui para frente.

**Pendências:** 1.001 sessões e 4.272 agendamentos sem autor (deliberadamente). Nenhum dos 10 profissionais tem conta de login.

### 1.4 Implementado em 31/07/2026

**Stub de RAG removido.** `lib/ai/ragClinicalContext.ts` (devolvia uma evolução fictícia de "dor lombar EVA 3" com similaridade 0.89) e `lib/ai/clinicalEmbeddingService.ts` (gerava vetor com `Math.random()`) foram deletados, junto com `routes/ai/ragClinical.ts`, seu único consumidor.

> **Correção a este documento:** a versão anterior descrevia isso como risco vivo em produção, "atrás de uma flag". Não era — `ragClinical.ts` **nunca foi montado** em `index.ts`, portanto era inalcançável. Continuava certo remover (o próximo a mexer poderia montá-lo achando que funcionava), mas não havia exposição real.

`lib/ai/clinicalContextBuilder.ts` foi mantido: o prompt dele é bom e serve à Fase 3. Recebeu o tipo `RetrievedContext` e um teste de regressão que garante que, sem contexto recuperado, o prompt **não** emite instruções clínicas — só manda recusar.

**Dimensão do vetor corrigida.** Migration `0149_fix_clinical_embeddings_dim.sql` (+ `.down.sql`), aplicada em produção: `vector(1536)` → `vector(1024)`, índice HNSW recriado. A migration aborta sozinha se a tabela tiver linhas. Schema Drizzle alinhado.

`CLINICAL_EMBEDDING_MODEL` e `CLINICAL_EMBEDDING_DIM` passaram a viver em `lib/workersAi.ts`, o registry central — a dimensão deixa de ser literal solto em dois lugares que podem divergir.

**Falha silenciosa eliminada.** `lib/ai/embeddings.ts` foi reescrito: guarda de dimensão antes do INSERT (erro legível em vez de erro opaco do Postgres), telemetria em Analytics Engine por estágio (`generate` / `dimension` / `persist`) e `ClinicalEmbeddingError` propagado em vez de engolido. 5 testes cobrindo os modos de falha, incluindo a regressão de 1024 × 1536.

**EVA: ausente deixou de parecer zero.** Em `EvolutionNoScrollPanel`, `discharge` caía para `0` quando ninguém tocava no EVA — a sessão exibia "0/10 · Sem dor", como se tivesse sido avaliada. Agora: badge âmbar "Não registrado" e `—` no lugar de `0/10`. Sem bloquear finalização, conforme decidido.

**Requisições garantidamente vazias cortadas.** Novo `GET /api/ai-clinical-search/status` (contagem de embeddings da organização) + hook `useClinicalIndexStatus`. `SimilarPatientsWidget` só busca se houver índice. `SemanticRecommenderWidget` saiu do `OverviewTab`: recebia `patient.main_condition`, coluna vazia nos 1.022 pacientes e ausente do tipo `Patient` — ficava invisível em 100% dos casos. Remontar quando a HD for extraída das avaliações (Fase 2).

Verificação: `tsc` limpo nos dois projetos, 45 testes da suíte de IA passando, `clinical_embeddings.embedding` confirmado como `vector(1024)` em produção.

---

### 1.5 Léxico clínico e parser — implementado e medido em 31/07/2026

O léxico deixou de ser pergunta bloqueante. O corpus se autovalida: com 11.346 evoluções, a co-ocorrência anatômica desambigua os termos com mais confiabilidade que memória humana.

**Siglas decifradas** (confirmadas por literatura + corpus):

| Sigla | Significado | Evidência no corpus |
|---|---|---|
| **CCA / CCF** | Cadeia cinética aberta / fechada | Cabeçalhos da avaliação física, seguidos de agachamento e step down (CCF). Confirmado por 3 estudos SciELO. |
| **TFS** (2.417) | Trapézio fibras superiores | Aparece com paravertebral torácico, periescapular, clavícula, tração cervical |
| **TTFFSS / TTFFS / TSF** | Plural e typo de TFS | Convenção brasileira de duplicar letras (MMII/MMSS) |
| **TFI** (335) | Trapézio fibras **inferiores** | Confirma que a clínica distingue as fibras |
| **IQT** (1.993) | Isquiotibiais | "tuberosidade isquiática", ponte, alongamento na faixa |
| **QDP** (2.834 c/ sinônimos) | **Quadríceps** | Pareado com IQT em SLR anterior, cadeira extensora, step down, mobilização patelar |
| **TIT** (402) | Trato iliotibial | — |
| **EENM** (5.234) | Eletroestimulação neuromuscular | — |
| **MWM** (338) | Mobilization With Movement (Mulligan) | — |

> **Erro corrigido:** minha primeira leitura de `QDP`, feita sobre uma ocorrência isolada ao lado de "fáscia plantar", foi "quadrado plantar". O corpus derrubou. Onde deixei os dados falarem, acertei; onde interpretei sozinho, errei. **O corpus é a fonte de verdade do léxico; a entrevista arbitra empates.**

**Distinção manual × massage gun:** mesma técnica, instrumento diferente. Manual permite palpação diagnóstica e dosagem por feedback do paciente; a pistola é percussão mecânica, mais rápida e padronizada. São esforços profissionais distintos e por isso códigos distintos.

**Cobertura medida em produção** (11.346 evoluções):

| Extração | Evoluções | % |
|---|---:|---:|
| ≥1 conduta identificada | 11.183 | **98,6%** |
| ≥1 região corporal | 11.089 | 97,7% |
| conduta **e** região | 11.009 | 97,0% |
| dosagem `NxM` | 7.661 | 67,5% |
| EVA numérica no texto | 469 | 4,1% |
| **cobertura total** | **11.264** | **99,3%** |
| sem nenhum match | 82 | 0,7% |

As 82 sem match não são falha do parser: são sessões puramente narrativas — reavaliação, alta médica, troca de convênio, relato sem conduta aplicada.

**Entregues:** `apps/api/src/lib/clinical/lexicon.ts` (vocabulário versionado, `LEXICON_VERSION`), `evolutionParser.ts` (extrações com `sourceStart`/`sourceEnd` para destacar o trecho de origem na UI) e 20 testes com trechos literais de produção — incluindo a guarda de que "muita dor muscular" **nunca** vira um valor de EVA.

Três siglas ficaram sem confirmação e estão em `NAO_RESOLVIDOS`, sem gerar extração: `RL` (1.358), `PQD` (385) e a confirmação de `GU` (965).

**Achado lateral sobre alta:** 1.458 evoluções mencionam alta/última sessão, e **26 pacientes** têm menção explícita de alta no texto. Não resolve a ausência do conceito estruturado (§13), mas mostra que o evento existe na operação e é parcialmente recuperável.

---

### 1.6 Camada derivada — tabela, backfill e gatilho (31/07/2026)

Migration **0150** aplicada em produção: `clinical_extractions`, com RLS por `app.org_id`, 6 índices e 4 constraints.

O contrato de camadas do §5.1 virou schema:

| Camada | Onde | Propriedade |
|---|---|---|
| 0 — bruto | `sessions.observacao` | imutável; nenhum job escreve |
| 1 — derivado | `clinical_extractions` com `method='parser'` | descartável e reconstruível |
| 2 — inferido | `clinical_extractions` com `method='ai'` | exige `confidence`; nunca alimenta agregado sem revisão |

O banco impõe a separação, não a convenção: `CHECK (method <> 'ai' OR confidence IS NOT NULL)` torna impossível gravar inferência sem declarar confiança, e `CHECK (method <> 'parser' OR lexicon_version IS NOT NULL)` garante que toda extração determinística seja rastreável até a versão do léxico que a produziu.

Consequência prática: **`TRUNCATE clinical_extractions` é seguro.** Se o léxico melhorar, sobe `LEXICON_VERSION`, roda o backfill de novo e sobrescreve. Errar sai barato — que é o que torna viável iterar o léxico sem medo.

**Idempotência** vem do índice único `(source_table, source_id, category, code, COALESCE(source_start,-1))`. O offset entra na chave porque a mesma conduta pode aparecer em dois trechos distintos da mesma evolução, e ambas as ocorrências são reais.

**Componentes:**
- `lib/clinical/extractionStore.ts` — traduz a saída do parser em linhas. Dosagem vira duas linhas numéricas (`series`, `repeticoes`) em vez de string "3x10", porque o objetivo é agregar progressão de carga. Ao reprocessar, apaga só `method='parser' AND reviewed_by IS NULL` — curadoria humana e inferência auditada sobrevivem.
- `jobs/backfillClinicalExtractions.ts` — lotes com cursor por `id` (estável mesmo se novas evoluções forem criadas durante a execução), teto de 500 por lote, e `staleOnly` para reprocessar só o defasado.
- `routes/admin/backfill-extractions.ts` — `POST` processa um lote e devolve `nextCursor`; `GET /status` reporta cobertura e quantas extrações ficaram para trás numa versão antiga do léxico.
- `routes/sessions.ts` — extração roda junto do embedding ao finalizar a evolução, então dado novo já nasce consultável, sem depender do backfill. O `catch` vazio do `waitUntil` virou log: era o mesmo padrão que escondeu ~11 mil falhas de embedding.

Verificação: **942 testes passando** em 169 arquivos, `tsc` sem erros, tabela confirmada em produção com RLS ativo.

**Pendente:** rodar o backfill das 11.346 evoluções. Depende de deploy, porque o job roda dentro do Worker — não dá para executá-lo daqui.

---

---

## 2. Brainstorming de oportunidades — organizado por alavanca de dado

Em vez de listar ideias por página, listo por **que dado existe de fato**. Uma ideia só é uma oportunidade se tiver matéria-prima.

### Alavanca 1 — Agendamentos (14.603 linhas, dado limpo e completo)

É o ativo mais confiável do sistema e o menos explorado. Permite hoje, sem nenhuma extração:

- taxa de falta por paciente, por dia da semana, por horário, por período;
- pacientes ativos sem próxima sessão marcada (**146** hoje — é a maior alavanca de receita do sistema);
- risco de abandono por janela de inatividade (**80** pacientes entre 30 e 90 dias sem retorno);
- intervalo médio entre sessões (**5,8 dias**) e detecção de pacientes cujo intervalo está aumentando;
- ociosidade de agenda por slot;
- número de sessões até a última sessão (proxy de "sessões até alta", com ressalvas — ver §4.4).

### Alavanca 2 — Texto das evoluções (11.336 registros, altamente padronizado)

Uma amostragem do texto revela que as evoluções **não são prosa livre**: são listas de condutas com vocabulário técnico muito repetido. Taxas de ocorrência medidas:

| Padrão no texto | Evoluções | % do total |
|---|---:|---:|
| Liberação miofascial (`lib mio`) | 9.413 | 83,0% |
| Padrão série×repetição (`3x10`) | 9.080 | 80,0% |
| Assinatura com CREFITO | 10.332 | 91,1% |
| TENS | 7.597 | 67,0% |
| Thera band / elástico | 6.109 | 53,8% |
| Eletroestimulação (EENM/Russa/FES) | 5.255 | 46,3% |
| Terapia combinada | 5.171 | 45,6% |
| Laser | 4.169 | 36,7% |
| Aeróbico (esteira/bike) | 2.418 | 21,3% |
| Menção a joelho | 3.735 | 32,9% |
| Menção a quadril | 2.869 | 25,3% |
| Menção a lombar | 2.733 | 24,1% |
| Menção a torácico | 1.982 | 17,5% |
| Menção a ombro | 1.742 | 15,4% |
| Menção a cervical | 1.177 | 10,4% |
| **Nenhum termo do léxico-piloto** | **157** | **1,4%** |

Isso destrava, **por parser determinístico e sem IA**:

- painel de condutas mais usadas (por clínica, por paciente, por patologia);
- regiões corporais mais tratadas e demanda por região;
- histórico de progressão de carga (séries×reps ao longo do tempo);
- detecção de mudança de conduta entre sessões ("o que mudou desde a última sessão");
- sugestão de próxima conduta baseada no que o próprio fisioterapeuta costuma fazer naquele quadro — não em literatura genérica.

### Alavanca 3 — Avaliações ZenFisio (531 registros, estrutura de seções fixa)

O texto de avaliação vive em `patient_evaluation_responses.responses->'fields'->>'Avaliação'` e segue um gabarito consistente:

```
25/10/24 (Amanda CREFITO 3/215954-F)
HD: Coxartrose + Tendinite glutea
<história / queixa / rotina / encaminhamento médico>
Remédios controlados: ...
Diabetes/hipertensão: ...
Cirurgias Prévias: ...
Exames complementares: ...
AVALIAÇÃO FÍSICA
  Inspeção / Palpação / ADM / CCA / CCF / Força / Propriocepção / Alongamento / Testes especiais / Pliometria
PLANO TERAPÊUTICO
  <objetivos>
```

Cabeçalhos em caixa alta e rótulos com dois-pontos tornam isso um problema de *split por delimitador*, não de NLP. O campo `extracted` do import atual só cobre `allergies`, `medications`, `pathologies`, `sports`, `surgeries` — deixa de fora exatamente o que tem valor clínico: **HD (hipótese diagnóstica), exame físico e plano terapêutico**.

### Alavanca 4 — Vetores (0 linhas hoje, 11.3k disponíveis para backfill)

Ver §7. É a única alavanca que exige infraestrutura, e a que responde às perguntas em linguagem natural do prompt §5.

### Alavanca 5 — O que simplesmente não existe

Honestidade sobre os buracos, porque o prompt pede indicadores que dependem deles:

| Dado ausente | Consequência |
|---|---|
| Escala de dor (49/11.346) | "Evolução da dor" é inviável hoje. Causa raiz identificada em §3.2. |
| Alta / desfecho | Não há campo de alta populado. "Sessões até alta" e "tempo até melhora" viram proxies frágeis. |
| Objetivos terapêuticos (0 linhas) | "Objetivos ativos" no perfil não tem fonte. Existe no plano terapêutico das avaliações, em texto. |
| Telefone (25/1.022) | Bloqueia CRM, lembretes e follow-up pós-alta. |
| `created_at` de pacientes | Todos os 1.022 têm `created_at` nos últimos 90 dias (data da migração). **Qualquer indicador de "novos pacientes" ou coorte por data de cadastro está quebrado** — usar a data da primeira sessão como proxy de admissão. |

---

## 3. Sugestões por página

### 3.1 Perfil do Paciente — `src/pages/patients/PatientProfilePage.tsx`

**Problema:** 13+ abas (`overview`, `evolution`, `timeline`, `analytics`, `personal`, `clinical`, `activity-lab`, `financial`, `gamification`, `documents`, `notes`, `tasks`, `evidence`, …). Isso não é riqueza, é dispersão: o fisioterapeuta não sabe onde procurar e a maioria das abas está vazia.

**Proposta — colapsar para 5 abas:**

| Aba | Absorve |
|---|---|
| **Visão geral** | overview + analytics + timeline compacta |
| **Clínico** | clinical + evolution + evidence + activity-lab |
| **Cadastro** | personal + documents |
| **Agenda & Financeiro** | financial + tasks |
| **Notas** | notes + gamification (se mantido) |

**Header clínico** (`src/components/patient/PatientProfileHeader.tsx`) — no máximo 4 fatos, todos calculáveis hoje:
`Última sessão · Próxima sessão (ou badge vermelho "sem retorno marcado") · Nº de sessões realizadas · Pendências (evolução faltando / sem avaliação)`.

**`src/components/patient/OverviewTab.tsx`:** `ClinicalAISnapshot` é legítimo — lê as últimas 10 sessões reais e recusa quando não há histórico; manter. Os outros três se auto-ocultam com `return null` por falta de dado, então não havia estado quebrado a esconder; a correção certa foi evitar a requisição inútil (§1.4).

**`src/components/patient/AssessmentComparison.tsx`** não é importado em nenhum lugar do projeto. É exatamente o componente de "comparar avaliação inicial vs atual" que o prompt §1 pede. **Não escrever um novo — montar este.**

### 3.2 Evolução Clínica — `src/pages/EvolucaoClinica.tsx`

Esta página já tem um arsenal de componentes prontos em `src/components/evolution/`: `EvolutionChart`, `EvolutionTimeline`, `EvolutionAlerts`, `EvolutionSummaryCard`, `SessionHistoryPanel`. A instrução é **reaproveitar, não recriar**.

> ⚠️ `src/pages/EvolucaoClinica.tsx` é **mockup estático** (paciente "Carla Ferreira" hardcoded, resquício do restyle do design system). O editor real é `src/pages/PatientEvolution.tsx` + `src/components/evolution/v2-improved/`.

**Correção de 31/07/2026 — este documento estava errado aqui.** A versão original afirmava que `PainScaleWidget.tsx` não estava montado e que essa era a causa raiz dos 49/11.346. A captura de EVA **existe e está montada**: é o `PainGauge` dentro de `EvolutionNoScrollPanel` (chegada, saída, delta, undo/redo, sparkline). `PainScaleWidget` é componente **legado substituído** por ele — montá-lo criaria uma segunda UI concorrente.

Separando importado de criado no app, o quadro real:

| Mês | Criadas no app | Com EVA | Importadas | Com EVA |
|---|---:|---:|---:|---:|
| Mai/2026 | 0 | — | 441 | 0 |
| Jun/2026 | 7 | 4 | 307 | 2 |
| Jul/2026 | 333 | **43 (12,9%)** | 0 | — |

Os 11.297 sem EVA são quase todos **importados** — o ZenFisio não tinha o campo, e isso é irrecuperável. Nas sessões criadas no app a captura funciona, com preenchimento de **12,9%**. O problema é de **adesão**, não de componente ausente, e a solução é de produto (obrigar na finalização × destacar × treinar), não código faltando.

**Painel lateral de contexto** (`EvolutionContextPanel`), preenchido só com dado real:
- últimas 3 sessões (`SessionHistoryPanel` já faz isso);
- condutas da sessão anterior, extraídas pelo parser da §7.2, como **chips clicáveis que preenchem a sessão atual** — replicar conduta é a operação mais frequente e hoje é digitação manual;
- regiões corporais tratadas recentemente, como chips;
- alertas de pendência (sem evolução em atendimento anterior, sem reavaliação há X dias);
- gráfico de dor **só quando houver ≥3 pontos** — abaixo disso, gráfico é decoração.

**"Gerar rascunho baseado na sessão anterior":** deve ser **cópia determinística da conduta anterior em modo editável**, não geração por LLM. O fisioterapeuta ajusta cargas e repetições. Zero risco de alucinação, e é o que ele faz na prática. LLM aqui não agrega — agrega risco.

### 3.3 Avaliação Inicial — `src/pages/AvaliacaoInicial.tsx`

**Visão dupla obrigatória**, lado a lado ou em toggle:

- **Original preservado** — o texto bruto do ZenFisio, imutável, sempre acessível, com link para `zenfisio_url`.
- **Normalizado** — os campos extraídos, cada um com badge de origem: `importado` (veio estruturado), `extraído` (parser determinístico, com o trecho original em tooltip), `inferido por IA` (com nível de confiança).

Nunca fundir as três camadas visualmente. A regra é: **o fisioterapeuta precisa saber, olhando, se aquele campo foi ele quem escreveu, se um parser deduziu, ou se uma IA chutou.**

**Validação de completude** (`EvaluationCompletenessPanel`): checklist do que falta (HD, exame físico, plano terapêutico, objetivos), calculado sobre a extração. Não bloqueia salvamento — sinaliza.

**Comparação entre avaliações:** montar `AssessmentComparison.tsx` (§3.1).

### 3.4 Agenda — `src/pages/Schedule.tsx`

Objetivo: **preparar o fisioterapeuta antes da sessão**, sem poluir a grade. Um único indicador visual por agendamento — um ponto colorido — com detalhe no hover/popover:

- 🔴 atendimento anterior deste paciente **sem evolução registrada** (902 casos no total, 326 nos últimos 90 dias);
- 🟠 paciente **sem nenhuma avaliação** (334 pacientes);
- 🟡 **sem reavaliação** há mais de N dias;
- ⚪ nada pendente.

Popover com: última sessão (data + condutas principais), regiões tratadas, e "sem retorno marcado após esta sessão".

### 3.5 Listagem de Pacientes — `src/pages/Patients.tsx`

Reaproveitar `src/components/patient/PatientAdvancedFilters.tsx` e `usePatientFilters.ts`. Adicionar filtros que mapeiam 1:1 nos indicadores da Fase 1 — todos calculáveis hoje:

- sem próxima sessão marcada (**146** ativos);
- em risco de abandono (30–90 dias sem retorno — **80**);
- com atendimento sem evolução (**902**);
- sem avaliação (**334**);
- sem telefone cadastrado (**997** — filtro operacional para a recepção corrigir o cadastro);
- por região corporal tratada (após §7.2);
- taxa de falta acima de X%.

Cada filtro deve aparecer como **chip com contagem** no topo, não escondido num painel — o valor está em ver "146" sem clicar.

Busca semântica (§7) entra na Fase 3, como um segundo modo do campo de busca, nunca substituindo a busca por nome.

### 3.6 Protocolos — `src/pages/Protocols.tsx`

Com o parser de condutas (§7.2), a página deixa de ser um catálogo estático e passa a mostrar **uso real**: quantas vezes cada protocolo/conduta foi aplicado, em que regiões, com que frequência por paciente. "Protocolos mais usados nesta clínica" tem 104 `exercise_protocols` cadastrados e 11 mil sessões para cruzar.

### 3.7 CRM/WhatsApp — `src/pages/CrmWhatsApp.tsx`

**Bloqueado por dado, não por código.** 25 telefones em 1.022 pacientes. Antes de qualquer campanha:

1. filtro "sem telefone" na listagem (§3.5) + fluxo de captura na recepção;
2. só então: campanhas por inatividade, follow-up pós-alta, reativação.

Quando destravado, a regra de conteúdo é rígida: mensagem **nunca** carrega dado clínico. Nada de patologia, região corporal ou evolução no corpo da mensagem — LGPD trata isso como dado sensível e WhatsApp não é canal controlado. O gancho é operacional ("faz um tempo que não nos vemos, quer marcar um horário?"), e o contexto clínico fica no sistema, para o humano que vai atender.

### 3.8 Indicadores/Gestão

**Não criar página nova.** Expandir `src/pages/analytics/AtRiskPatients.tsx` e `src/pages/CohortAnalysis.tsx` com os indicadores operacionais da Fase 1. Um painel de gestão com 4 números verdadeiros vale mais que 20 cards vazios.

---

## 4. Inventário de indicadores

Legenda de viabilidade:
- **🟢 hoje** — SQL puro sobre dado existente;
- **🟡 extração** — depende do parser determinístico (§7.2);
- **🔴 captura** — depende de novo dado ser capturado na UI daqui para frente. Não é recuperável retroativamente.

Risco = risco de interpretação clínica indevida.

### 4.1 Indicadores clínicos

| Indicador | Fonte | Cálculo | Onde | Público | P | Compl. | Viab. | Risco |
|---|---|---|---|---|---|---|---|---|
| Regiões corporais tratadas | `sessions.observacao` | léxico de regiões sobre texto | perfil, protocolos | fisio, gestor | P1 | M | 🟡 | baixo |
| Condutas mais usadas | `sessions.observacao` | léxico de técnicas | perfil, evolução, protocolos | fisio | P1 | M | 🟡 | baixo |
| Mudança de conduta entre sessões | idem | diff de conjuntos entre sessões consecutivas | evolução | fisio | P2 | M | 🟡 | baixo |
| Progressão de carga | idem | padrão `NxM` + kg ao longo do tempo | evolução | fisio | P2 | A | 🟡 | médio — carga ↑ não é sinônimo de melhora |
| Hipótese diagnóstica (HD) | avaliação ZenFisio | seção `HD:` | perfil, listagem | fisio, gestor | P1 | B | 🟡 | baixo |
| Diagnósticos mais comuns | HD + `patient_pathologies` (356) | frequência | gestão | gestor | P2 | B | 🟡 | baixo |
| Plano terapêutico inicial | avaliação ZenFisio | seção `PLANO TERAPÊUTICO` | perfil, evolução | fisio | P1 | B | 🟡 | baixo |
| Achados do exame físico | avaliação ZenFisio | seções `ADM`/`Força`/`Testes especiais` | avaliação | fisio | P2 | M | 🟡 | médio — texto qualitativo, não score |
| Sem evolução documentada | `appointments` ⟂ `sessions` | atendido sem sessão vinculada | agenda, listagem | fisio, gestor | P1 | B | 🟢 | baixo |
| Sem reavaliação há X dias | `patient_evaluation_responses` | `now() - max(created_at)` | agenda, perfil | fisio | P1 | B | 🟢 | baixo |
| Avaliação incompleta | extração da avaliação | seções obrigatórias ausentes | avaliação, listagem | fisio | P2 | M | 🟡 | baixo |
| Nº de sessões por paciente | `sessions` | `count` | header, listagem | todos | P1 | B | 🟢 | baixo |
| **Evolução da dor (EVA)** | `sessions.pain_scale` | série temporal | evolução, perfil | fisio, paciente | **P1** | B | **🔴** | **alto** — ver nota |
| Dor inicial vs atual | idem | primeiro vs último | header, perfil | fisio | P1 | B | 🔴 | alto |
| Pacientes com piora | idem | tendência de EVA | listagem, gestão | fisio | P2 | M | 🔴 | alto |
| Melhora funcional | `patient_session_metrics` (vazia) | — | — | fisio | P3 | A | 🔴 | alto |
| Tempo até melhora / sessões até alta | não há campo de alta | — | — | gestor | P3 | A | 🔴 | alto |
| Resposta por protocolo | cruzamento conduta × desfecho | — | gestão | gestor | P3 | A | 🔴 | **muito alto** — comparação sem controle |

> **Nota sobre dor (🔴/🟡).** **Correção:** a versão original afirmava que zero evoluções continham padrão numérico de dor. Isso era um **bug de regex meu** — usei `\b` como fronteira de palavra, que no POSIX do Postgres significa *backspace*, não fronteira; o correto é `\y`. Com o padrão certo, **466 evoluções (194 pacientes) registram EVA numérica no texto** ("EVA 4", "EVA 6/10", "EVA 5 para 3"). Essas são extraíveis por parser determinístico e recuperam uma série parcial. O que continua vetado é *inferir* número a partir de descrição qualitativa. O caminho correto é **elevar a adesão do EVA já capturado** (§3.2) e construir a série daqui para frente. Em 30 dias há dado suficiente para o gráfico; em 90, para tendência.
>
> **Risco alto** em toda a linha de dor/desfecho significa: esses números serão lidos como "o tratamento está funcionando". Precisam de rótulo explícito de amostra (`n=3 sessões`) e nunca devem aparecer como semáforo verde/vermelho isolado.

### 4.2 Indicadores operacionais — todos 🟢

| Indicador | Valor hoje | Cálculo | Onde | Público | P | Compl. | Risco |
|---|---:|---|---|---|---|---|---|
| Taxa de falta global | **20,9%** | status ∈ {faltou, faltou_com_aviso, nao_atendido} ÷ total | gestão, agenda | gestor, recepção | P1 | B | baixo |
| Falta por paciente | — | idem por `patient_id` | perfil, listagem | recepção | P1 | B | médio — não rotular paciente |
| ~~Falta por profissional~~ | — | **não calcular** | — | — | — | — | **inválido** — 94,6% das faltas estão sem autor (§1.1) |
| Ativos sem próxima sessão | **146** | atendido ≤60d ∧ sem futuro | listagem, gestão | recepção | **P1** | B | baixo |
| Risco de abandono | **80** | última sessão 30–90d ∧ sem futuro | listagem, CRM | recepção, gestor | P1 | B | médio |
| Pacientes inativos >90d | — | idem, janela maior | gestão | gestor | P2 | B | baixo |
| Intervalo médio entre sessões | **5,8 dias** | `lag()` sobre `sessions.date` | perfil, gestão | fisio, gestor | P2 | B | baixo |
| Intervalo aumentando | — | comparação de janelas | listagem | recepção | P2 | M | médio |
| Pacientes ativos (30d) | **92** | distinct com sessão ≤30d | gestão | gestor | P1 | B | baixo |
| Volume de sessões (30d) | **333** | count | gestão | gestor | P1 | B | baixo |
| Agenda ociosa | — | slots disponíveis vs ocupados | agenda, gestão | recepção | P2 | M | baixo |
| Falta por dia/horário | — | `GROUP BY` extract | gestão | gestor | P2 | B | baixo |
| Carga por fisioterapeuta | 9 profissionais | count por `therapist_id` | gestão | gestor | P2 | B | médio — volumes assimétricos, não normalizar sem contexto |
| Funil de captação | — | `contacts` → paciente | CRM | gestor | P3 | M | baixo |

### 4.3 Qualidade de prontuário — todos 🟢/🟡

| Indicador | Valor hoje | Viab. | P |
|---|---:|---|---|
| Atendimentos sem evolução | **902** (326 nos últimos 90d) | 🟢 | P1 |
| Pacientes com sessão e sem avaliação | **334** | 🟢 | P1 |
| Evoluções com texto muito curto (<80 chars) | **107** | 🟢 | P2 |
| Evoluções sem escala de dor | **11.297** | 🟢 | P1 |
| Evoluções sem conduta identificável | **157** (1,4%) | 🟡 | P2 |
| Avaliações sem HD | — | 🟡 | P1 |
| Avaliações sem plano terapêutico | — | 🟡 | P2 |
| Pacientes sem telefone | **997** | 🟢 | P1 |
| Registros importados ainda não normalizados | 531 avaliações + 11.3k sessões | 🟢 | P1 |

Esta categoria é a de **maior retorno imediato** e a de menor risco: são fatos verificáveis sobre o prontuário, não julgamentos sobre o paciente. Devem virar uma tela de "pendências da clínica", que é acionável de verdade.

### 4.4 Gestão

| Indicador | Viab. | P | Observação |
|---|---|---|---|
| Pacientes ativos por período | 🟢 | P1 | usar data da 1ª sessão como admissão, **não** `created_at` |
| Retenção / churn | 🟢 | P2 | coorte por mês da 1ª sessão |
| Lifetime clínico (nº de sessões) | 🟢 | P2 | média atual **12,9** |
| Demanda por região corporal | 🟡 | P2 | ver §2, alavanca 2 |
| Sazonalidade | 🟢 | P3 | há dados desde 11/2021 |
| Ticket / receita | 🔴 | P3 | tabelas financeiras vazias |
| Volume por profissional | 🟢 | P2 | 9 profissionais após a correção de autoria (§1.1) |

---

## 5. Arquitetura backend

### 5.1 Três camadas com trilha de origem

O requisito §11 do prompt ("diferenciar dado original, estruturado e inferido") vira a espinha dorsal do modelo:

```
CAMADA 0 — BRUTO (imutável, nunca sobrescrito)
  sessions.observacao
  patient_evaluation_responses.responses
  → nenhuma migration jamais escreve aqui

CAMADA 1 — DERIVADO DETERMINÍSTICO (reproduzível, descartável)
  clinical_extractions (method='parser', parser_version, source_span)
  patient_indicators (agregados operacionais)
  → pode ser truncada e reconstruída a qualquer momento

CAMADA 2 — INFERIDO POR IA (auditável, revisável)
  clinical_extractions (method='ai', model, prompt_version, confidence)
  ai_generated_summaries (com sources[])
  → sempre exibido com badge; nunca alimenta indicador agregado sem revisão
```

Regra de ouro: **a Camada 1 é sempre reconstruível a partir da Camada 0**. Se o parser melhorar, roda de novo e sobrescreve. Isso torna o parser barato de iterar — o custo de errar é um `TRUNCATE` + reprocessamento.

### 5.2 Tabelas propostas — e as que devem ser descartadas

**Criar:**

| Tabela | Papel | Campos-chave |
|---|---|---|
| `clinical_extractions` | camada 1+2 unificada | `source_table`, `source_id`, `field` (`hd`/`body_region`/`conduct`/`plan`), `value`, `method` (`parser`/`ai`), `parser_version`/`model`, `confidence`, `source_span` (offset no texto original), `reviewed_by`, `reviewed_at` |
| `patient_indicators` | snapshot de agregados por paciente | `patient_id`, `computed_at`, `last_session_at`, `next_appointment_at`, `sessions_count`, `no_show_rate`, `avg_interval_days`, `missing_evolutions`, `has_evaluation` |
| `patient_risk_flags` | flags acionáveis, uma linha por flag ativa | `patient_id`, `flag`, `severity`, `raised_at`, `resolved_at`, `evidence` (jsonb com os números que geraram) |
| `clinical_document_chunks` | unidade de RAG | `patient_id`, `source_table`, `source_id`, `chunk_index`, `content`, `metadata`, `embedding vector(1024)`, `embedding_model`, `embedding_version` |

**Descartar do prompt** (§4 pede, mas não se sustentam):

| Proposta do prompt | Por quê descartar |
|---|---|
| `patient_clinical_summary` | absorvido por `ai_generated_summaries` + `patient_indicators` |
| `treatment_goals` | `patient_goals` **já existe** e está vazia. Popular a existente, não criar outra. |
| `outcome_measures` | `standardized_test_results` já existe e está vazia. Idem. |
| `body_region_mentions`, `diagnosis_mentions` | casos particulares de `clinical_extractions.field`. Três tabelas para o mesmo conceito é ruído. |
| `clinical_events` | `sessions` + `appointments` já são a linha do tempo. Uma tabela de eventos duplicaria a verdade. |
| `clinical_documents` / `source_documents` | `patient_documents` já existe. |
| `clinical_embeddings` (nova) | **já existe** — precisa de correção de dimensão, não de substituição (§7.1). |

O padrão aqui é o mesmo do resto do sistema: **o schema já é grande demais**. Cada tabela nova e vazia aumenta a superfície de fachada.

### 5.3 Correção crítica de schema

`packages/db/src/schema/clinical_intelligence.ts:19` declara `vector(1536)` (comentário: "compatível com OpenAI/Gemini"), mas o writer real em `apps/api/src/lib/ai/embeddings.ts:26` usa `@cf/baai/bge-m3`, que produz **1024 dimensões**. O `INSERT` falha com erro de dimensão e é engolido pelo `catch` da linha 60, que só faz `console.error`. Resultado: **0 linhas, nenhum alerta, há meses**.

Correção (Fase 1): migration que dropa o índice HNSW, altera a coluna para `vector(1024)`, recria o índice, e alinha o schema Drizzle. Como a tabela está vazia, não há perda de dado. Registrar o modelo em `apps/api/src/lib/workersAi.ts` (o registry central — CLAUDE.md proíbe hardcode de `@cf/...`) e derivar a dimensão dali, para o erro não voltar.

Adicionalmente: o `catch` silencioso deve virar erro observável. Um pipeline de embeddings que falha 11 mil vezes sem ninguém notar é um problema de observabilidade, não de IA.

### 5.4 Endpoints

**Novos:**
- `GET /api/patients/:id/indicators` — snapshot de `patient_indicators` + flags ativas;
- `GET /api/analytics/operational` — os indicadores da §4.2, parametrizado por janela;
- `GET /api/analytics/record-quality` — os da §4.3, com listas paginadas de pacientes afetados (o número sem a lista não é acionável);
- `GET /api/patients/:id/context` — contexto pré-sessão para a agenda e o painel de evolução;
- `POST /api/clinical/extract` — dispara reprocessamento do parser (admin).

**Expandir:**
- `apps/api/src/routes/analytics/patient.ts` — absorver os indicadores individuais;
- `apps/api/src/routes/patients/clinical-details.ts` — anexar extrações da camada 1.

**Remover:** `apps/api/src/routes/ai/ragClinical.ts` na forma atual (§10.1).

### 5.5 Jobs

Usar a infra já existente — Queues (`apps/api/src/queue.ts`) e Workflows (`apps/api/src/workflows/`). Não criar cron novo; a memória do projeto registra que o cron `*/5` precisa permanecer DB-free sob pena de travar deploys.

| Job | Gatilho | Idempotência |
|---|---|---|
| `rebuildPatientIndicators` | pós-sessão + noturno | `UPSERT` por `patient_id` |
| `extractClinicalText` | pós-salvamento + backfill em lote | chave `(source_id, parser_version)` |
| `embedClinicalChunk` | pós-extração | `ON CONFLICT (source_id, chunk_index)` |

Backfill de 11.3k sessões: lotes de ~100 via Queue, com retomada por cursor. Não fazer numa requisição.

### 5.6 Performance, RLS e LGPD

- Índices: `(patient_id, date DESC)` em `sessions`; `(patient_id, status, date)` em `appointments`; HNSW já existe em `clinical_embeddings`.
- RLS: seguir o padrão do projeto — `current_setting('app.org_id', true)` via `withOrganizationPolicy` (`packages/db/src/schema/rls_helper.ts`) em **todas** as tabelas novas. Nenhuma exceção para tabelas derivadas: dado derivado de dado sensível é dado sensível.
- LGPD: `clinical_document_chunks` contém texto clínico integral e é a tabela de maior risco do sistema. Precisa entrar na política de retenção (`LGPD_RETENTION_POLICY.md`) e no fluxo de exclusão de paciente — apagar o paciente sem apagar os chunks deixa dado sensível órfão e indexado.
- Nenhum chunk clínico deve sair para provedor externo. Workers AI roda na Cloudflare; se em algum momento entrar provedor externo, o gate de sanitização do `AIRouter` passa a ser obrigatório, não opcional.

---

## 6. Arquitetura frontend

Seguir o que já é padrão no repositório, sem introduzir mecanismo novo:

- **Dados:** `request()` de `src/api/v2/base.ts` + TanStack Query. Atenção ao gotcha já documentado: `gcTime` menor que o `maxAge` do persister descarta o cache no login (aconteceu com `useSchedulePage`). Usar `gcTime: 24h` em queries que devem sobreviver ao reload.
- **Layout:** `PageLayout`.
- **Estilo:** superfícies sólidas. Sem `backdrop-blur`, sem transparências. Alertas clínicos usam **borda + ícone + texto**, não fundo colorido saturado — num prontuário, cor forte demais vira ruído em 10 minutos de uso.
- **Modais:** `DialogContent` é `flex-col` + `min-h-0` (o gotcha do grid que cortava modais altos). Sem scroll aninhado.
- **Gráficos:** só renderizar com ≥3 pontos; abaixo disso, mostrar os valores em texto.

**Componentes novos (poucos):**

| Componente | Papel |
|---|---|
| `src/components/patient/PatientIndicatorsHeader.tsx` | os 4 fatos do header |
| `src/components/patient/PatientRiskFlags.tsx` | flags acionáveis |
| `src/components/evolution/EvolutionContextPanel.tsx` | painel lateral (§3.2) |
| `src/components/evaluation/EvaluationCompletenessPanel.tsx` | checklist de completude |
| `src/components/clinical/SourceBadge.tsx` | badge `original` / `extraído` / `IA` — usado em toda parte |
| `src/components/analytics/RecordQualityPanel.tsx` | pendências da clínica |

**Componentes a montar (já existem, não usados):** `AssessmentComparison`.
**Componentes legados a não ressuscitar:** `PainScaleWidget` (substituído pelo `PainGauge`).

---

## 7. Estratégia de RAG, embeddings e busca semântica

### 7.1 Estado atual — o que está quebrado

| Arquivo | Problema |
|---|---|
| `apps/api/src/lib/ai/ragClinicalContext.ts` | `retrieveClinicalContext()` retorna **uma evolução fictícia hardcoded** ("dor lombar EVA 3", similaridade 0.89). A query pgvector real está comentada. |
| `apps/api/src/lib/ai/clinicalEmbeddingService.ts` | `generateEmbedding()` retorna `Array.from({length:1536}, () => Math.random())`. `processSessionForEmbedding()` não persiste nada — o `INSERT` está comentado. |
| `apps/api/src/routes/ai/ragClinical.ts` | consome o stub e devolve resposta de LLM sobre contexto inventado, com `confidenceScore` vindo do mock. |
| `packages/db/src/schema/clinical_intelligence.ts` | `vector(1536)` incompatível com bge-m3 (1024d) → todos os inserts falham. |
| `apps/api/src/lib/ai/embeddings.ts` | implementação **correta**, mas o `catch` silencioso escondeu a falha. |

O que **funciona** e deve ser preservado: `apps/api/src/routes/ai-clinical-search.ts` — busca semântica e "pacientes similares" com queries pgvector reais, filtro por `organization_id`, e `ORDER BY <=>` sobre o índice HNSW. Está correto; só não tem dado.

### 7.2 Parser determinístico — a base de tudo

Antes dos vetores, o parser. É mais barato, auditável e resolve mais indicadores.

**Léxico de condutas** (validado com as taxas da §2): liberação miofascial (manual / massage gun), TENS, laser, terapia combinada, EENM/Russa/FES, tração, mobilização (+ articulação), thera band/elástico, esteira/bike, treino de marcha, propriocepção/equilíbrio, alongamento, exercício resistido.

**Léxico de regiões:** lombar, cervical, torácica, quadril, joelho, ombro, punho, tornozelo/talocrural, pé/fáscia plantar, escapular, paravertebral, e as abreviações locais (TFS/TTFFSS, IQT, MMII/MMSS, QDP, CCA/CCF, ADM). **Este vocabulário abreviado é específico desta clínica** — precisa ser um dicionário versionado e revisável, não regex espalhada no código.

**Padrão de dosagem:** `\d+\s*x\s*\d+` (séries×reps, presente em 80% das evoluções), `\d+\s*kg`, `\d+['′]` (minutos).

**Parser de avaliação ZenFisio:** split pelos cabeçalhos fixos (`HD:`, `AVALIAÇÃO FÍSICA`, `Inspeção`, `Palpação`, `ADM`, `CCA`, `CCF`, `Força`, `Propriocepção`, `Alongamento`, `Testes especiais`, `Pliometria`, `PLANO TERAPÊUTICO`) e pelos rótulos com dois-pontos (`Remédios controlados:`, `Cirurgias Prévias:`, `Exames complementares:`, `Diabetes/hipertensão:`).

Cada extração grava `source_span` — o offset no texto original. Isso permite que a UI destaque o trecho que gerou o campo. É o que torna a extração **auditável** em vez de mágica.

**Onde a IA entra:** só no resíduo — texto que o parser não classificou. Sempre com `method='ai'`, `confidence`, e badge visual distinto. Nunca alimentando indicador agregado sem revisão humana.

### 7.3 O que vira embedding, e com que granularidade

| Documento | Chunk | Volume | Justificativa |
|---|---|---:|---|
| Evolução (`sessions.observacao`) | **1 chunk = 1 sessão** | ~11.3k | Textos de 200–1.400 chars. Já são a unidade semântica natural ("o que aconteceu naquele dia"). Dividir quebraria o contexto. |
| Avaliação ZenFisio | **1 chunk por seção** | ~4–6k | O blob tem 3–5k chars e mistura história, exame físico e plano. Sem split, todo resultado retorna o documento inteiro e o LLM se perde. |
| Prontuário (`medical_records`) | — | 0 | Campos vazios. Não indexar. |
| Wiki / protocolos / exercícios | já coberto | — | Já existe via AI Search (`AI_SEARCH`). Base não-sensível, mantém-se separada. |

**Não misturar índice clínico com índice de conhecimento.** O primeiro é dado sensível por paciente; o segundo é conteúdo institucional. Compartilhar índice é convidar vazamento.

### 7.4 Metadados obrigatórios por chunk

`organization_id`, `patient_id`, `source_table`, `source_id`, `chunk_index`, `document_type`, `document_date`, `therapist_id`, `embedding_model`, `embedding_version`, `content_hash`.

`content_hash` resolve reindexação: se o texto mudou, o hash muda, o chunk é reembedado. Se não mudou, o job é no-op — idempotência sem controle de estado externo.
`embedding_version` resolve troca de modelo: reembedar em background gravando a nova versão, e só então virar a chave de leitura. Sem downtime, sem misturar espaços vetoriais.

### 7.5 Quando vetor, quando SQL

Regra simples, e ela importa porque o erro mais comum é usar RAG onde `WHERE` resolve:

| Pergunta | Ferramenta |
|---|---|
| "quais pacientes fizeram TENS?" | **SQL** sobre `clinical_extractions` — resposta exata, rápida, completa |
| "quais pacientes estão em risco de abandono?" | **SQL** sobre `patient_indicators` |
| "quais avaliações estão incompletas?" | **SQL** |
| "quais pacientes têm lombalgia recorrente?" | **SQL + vetor** — SQL filtra por região, vetor ordena por similaridade de quadro |
| "resuma o histórico deste paciente" | **vetor + LLM**, com fontes |
| "o que mudou desde a última avaliação?" | **determinístico** (diff de extrações) + LLM só para redigir |
| "o paciente melhorou ou piorou?" | **nenhuma das duas hoje** — depende de dor/desfecho (§4.1). Deve responder "não há dado suficiente". |

Busca híbrida: `tsvector` em português sobre `content` (recall de termos técnicos e abreviações locais, onde o embedding é fraco) combinado com similaridade de cosseno via Reciprocal Rank Fusion. O jargão abreviado da clínica (TFS, IQT, QDP) é justamente onde o modelo denso erra e o léxico acerta.

### 7.6 pgvector vs Vectorize — decisão

**pgvector, decidido.**

| Critério | pgvector (Neon) | Vectorize |
|---|---|---|
| Isolamento por paciente | `WHERE patient_id = ...` — mesma transação, mesmo RLS | filtro por metadata, fora do RLS |
| Consistência | dado e vetor no mesmo banco; join direto com `sessions`/`patients` | índice separado, exige sincronização |
| Já provisionado | tabela + HNSW (`migrations/0101`) + queries prontas | do zero |
| Escala | 11.3k vetores é pequeno para HNSW | vantagem só em milhões |

O argumento decisivo é o primeiro: em dado clínico, o pior modo de falha é retornar o chunk de outro paciente. Com pgvector, o isolamento é o mesmo mecanismo que já protege o resto do sistema. Com Vectorize, é um segundo mecanismo, que pode divergir.

Vectorize/AI Search permanece onde já está: base de conhecimento não-sensível.

### 7.7 Guardrails contra alucinação

1. **Sem contexto → sem resposta.** Se o retrieval volta vazio ou abaixo do limiar de similaridade, responder "não há informação suficiente no histórico" e parar. Nunca deixar o LLM completar com conhecimento geral.
2. **Citação obrigatória.** Toda afirmação do resumo carrega referência à sessão/avaliação de origem, com data e link clicável. Resumo sem fonte não é renderizado.
3. **Temperatura baixa + instrução de abstenção** no prompt de sistema.
4. **Nunca gerar número clínico.** O LLM redige texto; qualquer valor (EVA, ADM, força, nº de sessões) vem de campo estruturado, não da geração.
5. **Rótulo permanente.** Resumo de IA aparece sempre com badge e data de geração, jamais como campo do prontuário.
6. **Versionamento.** `ai_generated_summaries` guarda modelo, versão do prompt, chunks usados e timestamp — auditável depois.
7. **RAG populacional só sobre agregados.** "Quais pacientes têm lombalgia recorrente?" retorna uma lista de IDs via SQL, e o profissional abre cada prontuário com sua permissão. Nunca joga chunks de vários pacientes num mesmo contexto de LLM.

---

## 8. Plano por fases

### Fase 1 — Verdade e quick wins (sem IA)

**Entregáveis**
1. Remover o stub de RAG (`ragClinicalContext.ts`, `clinicalEmbeddingService.ts`) e desativar `routes/ai/ragClinical.ts`.
2. Migration: `clinical_embeddings.embedding` → `vector(1024)`, recriar HNSW, alinhar Drizzle, registrar dimensão em `workersAi.ts`.
3. Trocar o `catch` silencioso de `embeddings.ts` por erro observável.
4. ✅ Distinguir "EVA não registrado" de "dor zero" no `PainGauge` (31/07).
5. ✅ Cortar as buscas semânticas garantidamente vazias (31/07).
6. `GET /api/analytics/operational` + `GET /api/analytics/record-quality` (§4.2, §4.3).
7. `patient_indicators` + job `rebuildPatientIndicators`.
8. Filtros com contagem na listagem de pacientes (§3.5).
9. Badges de pendência na agenda (§3.4).
10. Colapsar as abas do perfil de 13 para 5.

**Arquivos:** `apps/api/migrations/<próximo nº>_fix_clinical_embeddings_dim.sql` (+ `.down.sql`), `packages/db/src/schema/clinical_intelligence.ts`, `apps/api/src/lib/ai/embeddings.ts`, `apps/api/src/routes/analytics/`, `src/pages/patients/PatientProfilePage.tsx`, `src/components/patient/OverviewTab.tsx`, `src/pages/Patients.tsx`, `src/pages/Schedule.tsx`, `src/components/evolution/`.

**Riscos:** colapsar abas quebra deep links salvos — manter redirect dos valores antigos de `activeTab`.

**Aceite:** `SELECT format_type(...)` retorna `vector(1024)`; a tela de qualidade lista os 902/334/997 com os pacientes clicáveis; nenhum widget de IA renderiza sem dado; `pain_scale` começa a ser gravado em novas evoluções.

**Testes:** Vitest para os cálculos de indicador (fixtures com faltas, sem retorno, sem evolução); Testing Library para o gate dos widgets; Playwright para o fluxo de preencher dor e ver no gráfico.

**Prioridade: P1.**

---

### Fase 2 — Extração determinística

**Entregáveis**
1. `clinical_extractions` + RLS.
2. Dicionário versionado de condutas/regiões/abreviações (`apps/api/src/lib/clinical/lexicon.ts`) — revisável pelo fisioterapeuta.
3. Parser de evolução e parser de avaliação ZenFisio.
4. Backfill via Queue (11.3k sessões + 531 avaliações).
5. `SourceBadge` + exibição bruto × normalizado na avaliação (§3.3).
6. Painel de condutas e regiões no perfil e em Protocolos.
7. `EvaluationCompletenessPanel`; montar `AssessmentComparison`.

**Riscos:** léxico incompleto gera indicador enviesado ("só 60% das sessões têm conduta" pode ser falha do parser, não do prontuário). Mitigação: expor a taxa de cobertura do parser como métrica de primeira classe, ao lado de todo indicador que dele dependa.

**Aceite:** cobertura ≥95% das evoluções com ≥1 conduta identificada (o léxico-piloto já atinge **98,6%** — apenas 157 evoluções não casam com nenhum termo); toda extração com `source_span` navegável; texto bruto intacto (checksum antes/depois).

**Prioridade: P1.**

---

### Fase 3 — RAG por paciente

**Entregáveis**
1. `clinical_document_chunks` + HNSW + RLS.
2. Chunking (§7.3) e embedding via bge-m3.
3. Backfill em lote; reindexação por `content_hash`.
4. Busca híbrida (`tsvector` PT + vetor, RRF).
5. `POST /api/patients/:id/ask` com citação obrigatória.
6. Reativar os widgets da §3.1 sobre dado real.
7. Resumo de passagem de caso, com fontes.

**Riscos:** vazamento cross-patient (mitigação: `patient_id` no `WHERE` + teste automatizado que tenta recuperar chunk de outro paciente e **deve** falhar); custo de 15k embeddings (baixo, uma vez).

**Aceite:** teste de isolamento passa; resumo sem fonte não renderiza; retrieval vazio produz recusa explícita.

**Prioridade: P2.**

---

### Fase 4 — IA operacional e gestão

Coortes por mês da 1ª sessão; risco de abandono com sinais compostos; sugestões de follow-up para a recepção; insights populacionais só sobre agregados. **Pré-requisito:** resolver os 997 cadastros sem telefone.

**Prioridade: P2/P3.**

---

### Fase 5 — Assistente clínico

Perguntas em linguagem natural com roteamento SQL vs vetor (§7.5); sugestão de testes clínicos a partir da queixa, ancorada nos 79 `clinical_test_templates` cadastrados (não inventados); sugestão de conduta baseada no histórico da própria clínica.

**Regra permanente:** sugerir, nunca decidir. Toda saída é rascunho editável, com fonte, e o fisioterapeuta é quem assina.

**Prioridade: P3.**

---

## 9. Priorização consolidada

**P1 — agora**
Remover stub de RAG · corrigir dimensão do vetor · montar `PainScaleWidget` · gatear widgets falsos · indicadores operacionais e de qualidade · filtros com contagem · badges na agenda · colapsar abas · parser determinístico + backfill · visão bruto × normalizado.

**P2 — próximo ciclo**
RAG por paciente com citação · busca híbrida · reativar widgets · `AssessmentComparison` · coortes e retenção · painel de condutas · captura de telefone.

**P3 — depois**
Assistente em linguagem natural · sugestão de conduta · insights populacionais · sazonalidade · financeiro.

**Não fazer:** ranking de qualidade entre profissionais · dashboard de gestão novo · Vectorize para dado clínico · extração retroativa de EVA · resposta de "melhorou ou piorou?" antes de haver série de dor.

---

## 10. Riscos e cuidados

### 10.1 O risco mais grave, hoje, em produção

`apps/api/src/routes/ai/ragClinical.ts` devolve resposta de LLM construída sobre uma evolução **inventada** ("dor lombar EVA 3, tolerou bem exercícios de estabilização"), com `confidenceScore: 0.89` vindo do mock. Está atrás da flag `RAG_CLINICAL_ENABLED`, mas a flag é a única coisa separando dado clínico fabricado de um prontuário.

**Isso não é uma melhoria a planejar — é código a remover na Fase 1.** Um stub que retorna dado plausível é mais perigoso que um erro 500: o erro é visível, o dado plausível é assinado pelo fisioterapeuta.

### 10.2 Demais riscos

| Risco | Mitigação |
|---|---|
| Indicador de dor sobre n=3 sessões lido como tendência | rótulo de amostra sempre visível; sem tendência com <5 pontos |
| Parser incompleto vira indicador enviesado | cobertura do parser exibida ao lado do indicador |
| Vazamento cross-patient no RAG | `patient_id` no `WHERE` + teste de isolamento automatizado |
| Chunks clínicos fora da política de retenção | incluir em `LGPD_RETENTION_POLICY.md` e no fluxo de exclusão de paciente |
| Dado clínico em mensagem de WhatsApp | mensagens só operacionais; contexto clínico nunca sai do sistema |
| IA induzindo conduta | tudo é rascunho editável, com fonte; nunca campo final |
| Camada derivada divergindo do bruto | Camada 1 sempre reconstruível; bruto nunca sobrescrito |
| Ranking de qualidade entre profissionais | volume sim; qualidade não — amostras assimétricas e sem ajuste de case-mix |
| Coorte por `created_at` | usar data da 1ª sessão — todos os 1.022 cadastros são da migração |

---

## 11. Quick wins — ordem de execução sugerida

1. **Montar `PainScaleWidget` no editor de evolução.** Uma linha de JSX destrava toda a categoria de indicadores de dor daqui para frente. Maior valor/esforço do documento.
2. **Corrigir `vector(1536)` → `vector(1024)`.** Uma migration em tabela vazia; destrava toda a Fase 3.
3. **Remover o stub de RAG.** Elimina o risco da §10.1.
4. **Gatear os 4 widgets de IA.** Para de mostrar vazio como se fosse análise.
5. **Tela de qualidade de prontuário.** 902 atendimentos sem evolução, 334 pacientes sem avaliação, 997 sem telefone — tudo `GROUP BY`, tudo acionável hoje.
6. **Chip "146 sem próxima sessão" na listagem.** Provavelmente a maior alavanca de receita imediata do sistema.
7. **Badges de pendência na agenda.**
8. **Montar `AssessmentComparison`.** Componente pronto, nunca usado.

Nada nesta lista precisa de IA, de tabela nova ou de migração de dados.

---

## 12. Ambições posteriores

- Sugestão de conduta a partir do padrão da própria clínica ("em quadros parecidos, esta clínica costuma usar X na 4ª sessão") — muito mais confiável e adotável que recomendação de literatura genérica, porque nasce de 11 mil sessões reais dos mesmos dois profissionais.
- Detecção de estagnação: paciente com a mesma conduta há N sessões sem progressão de carga → gatilho de reavaliação.
- Passagem de caso automática entre fisioterapeutas, com fontes.
- Predição de falta por horário/histórico, alimentando confirmação ativa da recepção (20,9% de falta é dinheiro no chão).
- Relatório de alta gerado a partir do longitudinal, com fontes — só depois de existir o conceito de alta.

---

## 13. Perguntas antes de implementar

1. **Alta:** existe conceito de alta na operação da clínica? Sem ele, "sessões até alta", "tempo até melhora" e "taxa de sucesso" não têm denominador.
2. **Telefone:** os 997 cadastros sem telefone são perda na migração ZenFisio ou ausência na origem? Se for perda, vale reimportar antes de qualquer trabalho de CRM.
3. **Léxico:** quem valida o dicionário de abreviações (TFS, TTFFSS, IQT, QDP, CCA/CCF)? Precisa de uma sessão com a fisioterapeuta — errar aqui contamina todos os indicadores derivados.
4. **Dor:** EVA no início e no fim da sessão (como sugere `patient_session_metrics`), ou um único valor? Muda o widget e o esquema da série.
5. **Escopo do perfil:** as abas `gamification`, `activity-lab`, `evidence` e `biomechanics` estão em uso real ou são superfície morta? Se mortas, o colapso para 5 abas fica trivial.
6. **`medical_records`:** 534 linhas com todos os campos clínicos vazios — a migração falhou, ou a tabela foi abandonada em favor de `patient_evaluation_responses`? Se abandonada, deve ser marcada como deprecada para não confundir futuras análises.
7. **Volume:** 92 pacientes ativos em 30 dias, contra 1.021 cadastrados. A base é majoritariamente histórica? Isso muda a leitura de retenção e churn.

---

## 14. Arquivos prováveis a alterar/criar

### Alterar
```
packages/db/src/schema/clinical_intelligence.ts      # vector(1024)
apps/api/src/lib/ai/embeddings.ts                    # erro observável
apps/api/src/lib/workersAi.ts                        # registrar bge-m3 + dimensão
apps/api/src/routes/analytics/patient.ts             # indicadores individuais
apps/api/src/routes/patients/clinical-details.ts     # extrações da camada 1
apps/api/src/routes/sessions.ts                      # disparo de extração/embedding
apps/api/src/queue.ts                                # handlers dos jobs
src/pages/patients/PatientProfilePage.tsx            # 13 abas → 5
src/components/patient/OverviewTab.tsx               # gatear widgets de IA
src/components/patient/PatientProfileHeader.tsx      # header clínico
src/components/patient/PatientAdvancedFilters.tsx    # filtros de risco
src/components/patient/usePatientFilters.ts
src/pages/Patients.tsx                               # chips com contagem
src/pages/Schedule.tsx                               # badges de pendência
src/pages/EvolucaoClinica.tsx                        # montar PainScaleWidget + painel
src/pages/AvaliacaoInicial.tsx                       # bruto × normalizado
src/pages/analytics/AtRiskPatients.tsx               # indicadores operacionais
LGPD_RETENTION_POLICY.md                             # chunks clínicos
```

### Criar
```
apps/api/migrations/<n>_fix_clinical_embeddings_dim.sql (+ .down.sql)
apps/api/migrations/<n>_clinical_extractions.sql
apps/api/migrations/<n>_patient_indicators.sql
apps/api/migrations/<n>_clinical_document_chunks.sql
apps/api/src/lib/clinical/lexicon.ts                 # dicionário versionado
apps/api/src/lib/clinical/evolutionParser.ts
apps/api/src/lib/clinical/evaluationParser.ts
apps/api/src/services/patientIndicatorsService.ts
apps/api/src/services/clinicalRagService.ts
apps/api/src/jobs/rebuildPatientIndicators.ts
apps/api/src/jobs/extractClinicalText.ts
apps/api/src/routes/analytics/operational.ts
apps/api/src/routes/analytics/recordQuality.ts
apps/api/src/routes/patientInsights.ts
src/components/clinical/SourceBadge.tsx
src/components/patient/PatientIndicatorsHeader.tsx
src/components/patient/PatientRiskFlags.tsx
src/components/evolution/EvolutionContextPanel.tsx
src/components/evaluation/EvaluationCompletenessPanel.tsx
src/components/analytics/RecordQualityPanel.tsx
src/hooks/usePatientIndicators.ts
```

### Remover
```
apps/api/src/lib/ai/ragClinicalContext.ts            # stub
apps/api/src/lib/ai/clinicalEmbeddingService.ts      # stub
apps/api/src/routes/ai/ragClinical.ts                # consumidor do stub
```

### Montar (já existem, sem uso)
```
src/components/evolution/PainScaleWidget.tsx
src/components/patient/AssessmentComparison.tsx
```

---

## Apêndice A — Queries de verificação

Reexecutáveis no projeto Neon `purple-union-72678311`.

```sql
-- Volumes gerais e estado dos embeddings
SELECT
 (SELECT count(*) FROM patients)             AS patients,
 (SELECT count(*) FROM sessions)             AS sessions,
 (SELECT count(*) FROM appointments)         AS appointments,
 (SELECT count(*) FROM clinical_embeddings)  AS embeddings,
 (SELECT format_type(atttypid, atttypmod) FROM pg_attribute
   WHERE attrelid='clinical_embeddings'::regclass AND attname='embedding') AS emb_type;
-- → 1022 | 11346 | 14603 | 0 | vector(1536)

-- Qualidade das evoluções
SELECT count(*) AS total,
 count(*) FILTER (WHERE length(trim(coalesce(observacao,'')))>0) AS com_texto,
 count(*) FILTER (WHERE length(coalesce(observacao,''))>=80)     AS texto_min80,
 count(*) FILTER (WHERE pain_scale IS NOT NULL)                  AS com_dor,
 count(DISTINCT patient_id) AS pacientes,
 count(DISTINCT therapist_id) AS terapeutas
FROM sessions WHERE deleted_at IS NULL;
-- → 11346 | 11336 | 11239 | 49 | 785 | 10 (era 2 antes da correção de autoria)

-- Indicadores operacionais
WITH ult AS (
  SELECT p.id,
    max(a.date) FILTER (WHERE a.status='atendido') AS ultima,
    min(a.date) FILTER (WHERE a.date > current_date
      AND a.status IN ('agendado','presenca_confirmada')) AS proxima,
    count(*) FILTER (WHERE a.status IN ('faltou','faltou_com_aviso','nao_atendido')) AS faltas,
    count(*) FILTER (WHERE a.status='atendido') AS atendidos
  FROM patients p LEFT JOIN appointments a ON a.patient_id=p.id
  GROUP BY p.id)
SELECT count(*) FILTER (WHERE atendidos>0) AS com_atendimento,
 count(*) FILTER (WHERE proxima IS NOT NULL) AS com_proxima,
 count(*) FILTER (WHERE atendidos>0 AND proxima IS NULL AND ultima > current_date-60) AS ativos_sem_proxima,
 count(*) FILTER (WHERE ultima BETWEEN current_date-90 AND current_date-30 AND proxima IS NULL) AS risco_abandono,
 round(avg(atendidos) FILTER (WHERE atendidos>0),1) AS media_sessoes,
 round(100.0*sum(faltas)/nullif(sum(faltas+atendidos),0),1) AS pct_falta
FROM ult;
-- → 890 | 25 | 146 | 80 | 12.9 | 20.9

-- Qualidade de prontuário
SELECT
 (SELECT count(*) FROM appointments a WHERE a.status='atendido'
   AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.appointment_id=a.id AND s.deleted_at IS NULL)) AS sem_evolucao,
 (SELECT count(*) FROM patients p WHERE EXISTS(SELECT 1 FROM sessions s WHERE s.patient_id=p.id)
   AND NOT EXISTS(SELECT 1 FROM patient_evaluation_responses r WHERE r.patient_id=p.id)) AS sem_avaliacao,
 (SELECT count(*) FROM patients WHERE phone IS NULL OR phone='') AS sem_telefone;
-- → 902 | 334 | 997

-- Viabilidade do parser determinístico
SELECT
 count(*) FILTER (WHERE observacao ~* 'lib(era[çc][ãa]o)?\s*mio') AS lib_mio,
 count(*) FILTER (WHERE observacao ~* '\mtens\M')                 AS tens,
 count(*) FILTER (WHERE observacao ~* '\d+\s*x\s*\d+')            AS series_reps,
 count(*) FILTER (WHERE observacao ~* 'CREFITO')                  AS com_crefito,
 count(*) FILTER (WHERE observacao ~* '(eva|dor)\s*[:=]?\s*([0-9]|10)\b') AS padrao_dor_numerica
FROM sessions WHERE deleted_at IS NULL;
-- → 9413 | 7597 | 9080 | 10332 | 0
```
