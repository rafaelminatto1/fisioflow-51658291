# Sistema Completo de Biomecanica do App Professional

Data: 2026-06-14
Status: aprovado para planejamento de implementacao
Produto: FisioFlow Professional App

## Objetivo

Transformar a secao de biomecanica do app professional em um sistema completo de analise de corrida e movimento, combinando:

- Captura guiada e upload de video/foto.
- Pipeline assincrono de processamento biomecanico.
- Ferramentas manuais tipo Kinovea para revisao tecnica.
- Protocolos e metricas de corrida, marcha, salto, postura e testes funcionais.
- Comparacao longitudinal e laudo clinico assinado.
- Prescricao sugerida e gates de progressao baseados em dados.

O sistema deve reaproveitar a base existente em `apps/professional-app/app/biomecanica`, `apps/api/src/routes/biomechanics.ts`, `packages/db/src/schema/biomechanics.ts`, R2, Stream opcional, Queue, Workflows, Analytics Engine, Workers AI, Browser Rendering e Durable Objects.

## Referencias De Design

O handoff externo foi baixado e inspecionado a partir do link fornecido. O pacote inclui:

- `fisioflow-design-system/project/README.md`
- `fisioflow-design-system/project/protocolo-detalhe/index.html`
- `fisioflow-design-system/project/ui_kits/professional-app/*.html`

Diretrizes adotadas:

- Interface em portugues do Brasil.
- Tom clinico, direto e operacional.
- Nunito como familia principal.
- Fundo neutro frio, superficies brancas e azul Activity `#0080FF` apenas para acoes/dados ativos.
- Sem elementos decorativos; imagens e videos devem ser funcionais.
- Telas densas, com KPIs, badges, filtros e acoes claras.

## Estado Atual

Ja existem telas mobile:

- `/biomecanica` painel.
- `/biomecanica/tests` biblioteca de testes.
- `/biomecanica/capture` captura/upload.
- `/biomecanica/analysis` player, goniometro, overlays e sugestao de prescricao.
- `/biomecanica/comparison` comparacao antes/depois.
- `/biomecanica/report` laudo, PDF, assinatura e compartilhamento.

Ja existem APIs:

- `POST /api/biomechanics`
- `GET /api/biomechanics/patient/:patientId`
- `GET /api/biomechanics/:id`
- `GET /api/biomechanics/patient/:patientId/comparison`
- `POST /api/biomechanics/:id/pdf`
- `POST /api/biomechanics/:id/sign`
- `GET /api/biomechanics/:id/verify`

Ja existem tabelas:

- `biomechanics_assessments`
- `biomechanics_metrics`

## Produto Alvo

### Fluxo Principal

1. O fisioterapeuta abre o hub de biomecanica.
2. Seleciona paciente, protocolo e objetivo da avaliacao.
3. Captura ou envia video/foto com checklist de qualidade.
4. O app cria uma avaliacao em estado `uploaded` e envia o arquivo para R2/Stream.
5. A API cria um job de processamento.
6. A fila/workflow processa midia, extrai frames, detecta pose, calcula metricas e publica status.
7. O fisioterapeuta revisa no workbench, ajusta medidas, adiciona anotacoes e valida achados.
8. O sistema gera comparacao longitudinal, sugestoes de conduta e laudo.
9. O laudo e assinado, versionado e compartilhado com paciente quando aplicavel.
10. As metricas alimentam evolucao clinica, protocolos, dashboard e prescricao.

### Modulos Do App

#### 1. Hub De Biomecanica

Responsabilidade:

- Mostrar fila de jobs, avaliacoes pendentes, capturas recentes, agenda e pacientes com alerta.
- Dar entrada rapida para nova captura, importacao e revisao.

Componentes:

- KPIs: pendentes, processando, concluidas hoje, falhas.
- Lista de jobs com status: `uploaded`, `queued`, `processing`, `needs_review`, `validated`, `failed`.
- Alertas de qualidade: baixa luz, enquadramento ruim, pouca confianca, video curto.
- Atalhos para corrida, marcha, salto, postura e funcional.

#### 2. Biblioteca De Protocolos Biomecanicos

Responsabilidade:

- Organizar testes padronizados e protocolos clinicos.
- Definir quais views, repeticoes, metricas e gates cada protocolo exige.

Categorias iniciais:

- Corrida.
- Marcha.
- Salto/performance.
- Agachamento e MMII.
- Postura estatica.
- Ombro/MMSS.
- Coluna/tronco.
- Teste funcional livre.

Protocolos iniciais:

- Corrida em esteira ou rua: sagital e posterior.
- Marcha 6m: sagital e frontal.
- Agachamento: frontal e sagital.
- Step-down: frontal.
- CMJ: frontal e sagital.
- Hop test: frontal e sagital.
- Avaliacao postural: frontal, sagital e posterior.
- Elevacao de ombro: frontal.

Cada protocolo define:

- Instrucoes de captura.
- Views obrigatorias.
- Duracao minima.
- Repeticoes esperadas.
- Landmarks criticos.
- Metricas.
- Regras de qualidade.
- Criterios de progressao.
- Red flags.
- Evidencias vinculadas a Wiki.

#### 3. Captura Guiada

Responsabilidade:

- Capturar video/foto com qualidade suficiente para analise.
- Reduzir variabilidade operacional entre profissionais.

Funcionalidades:

- Seletor de paciente.
- Seletor de protocolo.
- Seletor de view: frontal, sagital, posterior, superior quando aplicavel.
- Checklist pre-captura: distancia, iluminacao, corpo inteiro, marcador de escala, permissao LGPD.
- Calibracao: linha de prumo, escala por objeto conhecido, altura do paciente ou distancia.
- Gravacao e upload de arquivo.
- Indicador de qualidade em tempo real quando disponivel.
- Criacao de varias tentativas por view.
- Escolha da melhor tentativa antes de processar.

Estados:

- `idle`
- `calibrating`
- `recording`
- `uploading`
- `uploaded`
- `queued`
- `processing`
- `failed`

#### 4. Pipeline De Processamento

Responsabilidade:

- Converter midia bruta em dados clinicos revisaveis.

Etapas:

1. `ingest`: registrar midia, salvar metadados, validar permissao e tamanho.
2. `transcode`: gerar formato padrao e thumbnails quando necessario.
3. `frame_extraction`: extrair frames-chave e amostragem temporal.
4. `pose_detection`: gerar landmarks por frame.
5. `tracking`: suavizar landmarks, detectar repeticoes/fases/eventos.
6. `metric_calculation`: calcular metricas do protocolo.
7. `quality_review`: gerar quality score e flags.
8. `clinical_summary`: gerar achados preliminares com IA quando habilitado.
9. `ready_for_review`: liberar workbench.

Infraestrutura:

- R2/Stream para midia.
- `BACKGROUND_QUEUE` para trabalhos curtos.
- Workflow dedicado novo para pipeline duravel e reprocessamento.
- Analytics Engine para eventos operacionais.
- Neon para metadados, jobs, metricas, frames resumidos e auditoria.

Reprocessamento:

- Deve preservar a midia original.
- Deve versionar algoritmo/modelo.
- Deve registrar quem reprocessou e por que.
- Deve permitir comparar resultados de versoes de algoritmo.

#### 5. Workbench De Analise

Responsabilidade:

- Ser a tela de revisao tecnica e clinica.

Ferramentas:

- Player com play/pause, frame step, velocidade, scrubber e marcadores.
- Goniometro manual de 3 pontos.
- Linhas, setas, angulos, distancia e texto.
- Calibracao por escala.
- Overlay de pose.
- Heatmap de confianca por landmark.
- Timeline de eventos: contato inicial, toe-off, pico de flexao, aterrissagem, repeticoes.
- Side-by-side e ghost overlay entre sessoes.
- Seletor de tentativa/view.
- Painel de metricas.
- Edicao manual de achados.
- Validacao final do fisioterapeuta.

Modos:

- `view`: inspecao.
- `measure`: medidas manuais.
- `annotate`: desenho/anotacao.
- `compare`: comparacao.
- `review`: validacao clinica.

#### 6. Metricas

Metricas por dominio:

Corrida:

- Cadencia.
- Comprimento de passada estimado.
- Tempo de contato.
- Oscilacao vertical estimada.
- Foot strike estimado.
- Inclinacao de tronco.
- Valgo dinamico.
- Assimetria direita/esquerda.
- Overstride proxy.

Marcha:

- Cadencia.
- Tempo de apoio.
- Tempo de balanco.
- Simetria de passo.
- Comprimento de passo estimado.
- Velocidade estimada quando houver escala.
- Trendelenburg/pelve.
- ROM de quadril, joelho e tornozelo.

Salto/performance:

- Altura estimada quando tecnicamente viavel.
- Tempo de voo.
- LSI.
- Valgo na aterrissagem.
- Assimetria de impulsao/aterrissagem.
- RSI para drop jump quando protocolo suportar.
- Controle de tronco.

Postura:

- Alinhamento de cabeca.
- Ombros.
- Pelve.
- Joelhos.
- Prumo.
- Assimetria frontal.
- Desvios sagitais.

Funcional/MMII:

- ROM joelho.
- ROM quadril.
- Dorsiflexao.
- Valgo dinamico.
- Inclinacao de tronco.
- Queda pelvica.
- Controle excentrico.

Metricas devem ser salvas em formato normalizado em `biomechanics_metrics` e tambem em payload estruturado dentro da avaliacao para leitura completa.

#### 7. Comparacao Longitudinal

Responsabilidade:

- Comparar sessoes do mesmo paciente, protocolo e view.

Funcionalidades:

- Antes/depois.
- Ghost overlay.
- Tabela de deltas.
- Grafico por metrica.
- Comparacao com baseline.
- Sinalizacao de melhora, piora, estabilidade e novo dado.
- Escolha manual de sessoes.
- Export para laudo.

#### 8. Laudo E Assinatura

Responsabilidade:

- Produzir documento clinico auditavel.

Conteudo:

- Identificacao do paciente.
- Protocolo e contexto.
- Metodologia de captura.
- Qualidade da analise.
- Principais metricas.
- Comparacao longitudinal.
- Imagens/frames-chave com anotacoes.
- Achados clinicos.
- Conclusao.
- Recomendacoes.
- Limitacoes.
- Hash, assinatura e integridade.

Regras:

- Laudo deve indicar quando metricas sao estimadas.
- Laudo deve distinguir IA preliminar de validacao profissional.
- Alteracoes em dados clinicos devem invalidar/regerar PDF.

#### 9. Prescricao E Protocolos Adaptativos

Responsabilidade:

- Fechar o ciclo analise -> conduta.

Funcionalidades:

- Sugestoes de exercicios com justificativa.
- Gates de progressao por protocolo.
- Regressoes por dor/qualidade de movimento.
- Vinculo com HEP.
- Preview do que o paciente vera.
- Registro de aceite, edicao ou rejeicao pelo fisioterapeuta.

## Modelo De Dados Proposto

### Novas Tabelas

`biomechanics_media`

- `id`
- `organization_id`
- `patient_id`
- `assessment_id`
- `r2_key`
- `stream_uid`
- `media_type`
- `view`
- `duration_ms`
- `fps`
- `width`
- `height`
- `content_type`
- `size_bytes`
- `quality_score`
- `metadata`
- `created_at`

`biomechanics_jobs`

- `id`
- `organization_id`
- `patient_id`
- `assessment_id`
- `media_id`
- `status`
- `stage`
- `progress`
- `error_code`
- `error_message`
- `model_provider`
- `model_name`
- `model_version`
- `algorithm_version`
- `started_at`
- `completed_at`
- `created_by`
- `created_at`
- `updated_at`

`biomechanics_protocols`

- `id`
- `organization_id`
- `slug`
- `name`
- `category`
- `description`
- `capture_requirements`
- `metric_definitions`
- `quality_rules`
- `progression_gates`
- `red_flags`
- `evidence_refs`
- `is_system`
- `version`
- `created_at`
- `updated_at`

`biomechanics_frames`

- `id`
- `organization_id`
- `assessment_id`
- `media_id`
- `frame_index`
- `time_ms`
- `thumbnail_key`
- `landmarks`
- `confidence`
- `events`
- `created_at`

`biomechanics_events`

- `id`
- `organization_id`
- `assessment_id`
- `media_id`
- `event_type`
- `time_ms`
- `frame_index`
- `confidence`
- `metadata`
- `created_at`

`biomechanics_annotations`

- `id`
- `organization_id`
- `assessment_id`
- `media_id`
- `frame_index`
- `time_ms`
- `tool`
- `geometry`
- `label`
- `created_by`
- `created_at`
- `updated_at`

`biomechanics_review_actions`

- `id`
- `organization_id`
- `assessment_id`
- `action`
- `from_status`
- `to_status`
- `notes`
- `created_by`
- `created_at`

### Alteracoes Em Tabelas Existentes

`biomechanics_assessments`

Adicionar ou consolidar:

- `protocol_id`
- `primary_media_id`
- `job_id`
- `status`
- `quality_score`
- `capture_context`
- `validated_by`
- `validated_at`
- `algorithm_version`
- `report_hash`
- `signed_at`
- `signature_metadata`

`biomechanics_metrics`

Adicionar ou consolidar:

- `side`
- `phase`
- `view`
- `confidence`
- `source`
- `normal_range`
- `severity`
- `algorithm_version`

## API Proposta

### Mobile/Professional

- `GET /api/biomechanics/dashboard`
- `GET /api/biomechanics/protocols`
- `POST /api/biomechanics/protocols`
- `GET /api/biomechanics/protocols/:id`
- `POST /api/biomechanics/captures`
- `POST /api/biomechanics/:id/media/upload-url`
- `POST /api/biomechanics/:id/media/complete`
- `POST /api/biomechanics/:id/process`
- `GET /api/biomechanics/:id/job`
- `POST /api/biomechanics/:id/reprocess`
- `GET /api/biomechanics/:id/workbench`
- `POST /api/biomechanics/:id/annotations`
- `PATCH /api/biomechanics/:id/metrics/:metricId`
- `POST /api/biomechanics/:id/validate`
- `POST /api/biomechanics/:id/prescription-suggestions`
- `GET /api/biomechanics/patient/:patientId/timeline`

### Jobs/Interno

- Queue task `PROCESS_BIOMECHANICS_MEDIA`.
- Queue task `GENERATE_BIOMECHANICS_REPORT`.
- Workflow type novo `biomechanics-analysis`.
- Binding novo sugerido: `WORKFLOW_BIOMECHANICS_ANALYSIS`.

## Estados

Assessment:

- `draft`
- `uploaded`
- `queued`
- `processing`
- `needs_review`
- `validated`
- `reported`
- `signed`
- `failed`
- `archived`

Job:

- `queued`
- `running`
- `waiting_external_model`
- `completed`
- `failed`
- `cancelled`

Media:

- `pending_upload`
- `uploaded`
- `transcoded`
- `processed`
- `rejected`

## LGPD, Seguranca E Auditoria

Requisitos:

- Midia biomecanica e dado sensivel de saude.
- Armazenar videos clinicos em bucket privado quando possivel.
- Usar URL assinada para download.
- Registrar consentimento/justificativa clinica.
- Preservar isolamento por `organization_id`.
- Aplicar RLS nas novas tabelas.
- Auditar visualizacao, processamento, validacao, assinatura, compartilhamento e exclusao.
- Permitir retencao e exclusao conforme politica LGPD.
- Nunca expor URL publica permanente para midia sensivel sem decisao explicita.

## Observabilidade

Eventos minimos:

- `biomechanics_capture_started`
- `biomechanics_upload_completed`
- `biomechanics_job_started`
- `biomechanics_job_failed`
- `biomechanics_job_completed`
- `biomechanics_review_opened`
- `biomechanics_assessment_validated`
- `biomechanics_report_generated`
- `biomechanics_report_signed`
- `biomechanics_prescription_suggested`

Metrica operacional:

- Tempo medio de processamento.
- Taxa de falha por protocolo.
- Quality score medio.
- Uso por profissional.
- Percentual de laudos validados.

## Fases De Entrega

### Fase 1: Fundacao De Dados E Jobs

- Criar migrations.
- Expandir tipos TypeScript.
- Criar endpoints de protocolos, captura, upload e jobs.
- Integrar Queue com `PROCESS_BIOMECHANICS_MEDIA`.
- Exibir status real no hub.

Aceite:

- Um video pode ser registrado, enviado, enfileirado e chegar a `needs_review` com metricas simuladas/estruturadas.

### Fase 2: Captura Guiada E Biblioteca Completa

- Completar biblioteca de protocolos.
- Melhorar captura guiada.
- Adicionar checklist, tentativas, views e quality score.
- Vincular protocolo ao assessment.

Aceite:

- Cada protocolo inicial guia captura, cria media por view e bloqueia processamento se requisitos minimos falharem.

### Fase 3: Workbench Kinovea-Like

- Player robusto.
- Goniometro, linhas, setas, texto e calibracao.
- Anotacoes persistentes.
- Timeline de eventos.
- Edicao/validacao de metricas.

Aceite:

- Fisio consegue revisar video, medir manualmente, salvar anotacoes e validar avaliacao.

### Fase 4: Metricas Por Dominio

- Implementar calculos por protocolo.
- Normalizar metricas.
- Implementar comparacao longitudinal real.
- Adicionar graficos e deltas.

Aceite:

- Corrida, marcha, salto, postura e funcional produzem metricas comparaveis entre sessoes.

### Fase 5: Laudo, Assinatura E Prescricao

- Completar laudo com frames/anotacoes.
- Gerar PDF versionado.
- Assinar/verificar integridade.
- Sugerir prescricao e gates de progressao.

Aceite:

- Uma avaliacao validada gera laudo assinado e sugestao editavel de conduta.

### Fase 6: IA Avancada E Analytics

- Trocar metricas simuladas por processamento real conforme modelo/servico escolhido.
- Adicionar validacao de qualidade por IA.
- Analytics populacional por protocolo.
- Protocolos adaptativos.

Aceite:

- Sistema processa videos reais com tracking, sinaliza confianca, permite reprocessamento e mede desfechos agregados.

## Testes

Unitarios:

- Normalizacao de metricas.
- Regras de qualidade.
- Estados de job.
- Permissoes por organizacao.
- Deltas de comparacao.
- Hash do laudo.

Integracao:

- Criar captura -> upload complete -> queue -> assessment `needs_review`.
- Validar assessment -> gerar PDF -> assinar -> verificar.
- Criar anotacao -> aparecer no workbench e laudo.
- Comparar duas avaliacoes do mesmo protocolo.

E2E mobile:

- Iniciar captura.
- Enviar video.
- Acompanhar processamento.
- Revisar workbench.
- Validar.
- Gerar laudo.
- Abrir comparacao.

Seguranca:

- Usuario de outra organizacao nao acessa media, jobs, metricas, anotacoes ou laudos.
- URL assinada expira.
- Evento de auditoria e gravado em acoes sensiveis.

## Riscos E Mitigacoes

Risco: processamento de pose real exigir provider externo ou codigo nativo.
Mitigacao: criar contrato de pipeline e fallback com metricas manuais/assistidas.

Risco: custo de video e IA.
Mitigacao: quality gate antes de processar, amostragem de frames, cache por hash e reprocessamento controlado.

Risco: falsa precisao clinica.
Mitigacao: confidence score, avisos no laudo, validacao obrigatoria por profissional e rastreio de algoritmo.

Risco: volume de landmarks por frame crescer demais.
Mitigacao: guardar landmarks completos em R2 quando necessario e persistir no banco somente frames/eventos/metricas essenciais.

Risco: escopo muito grande para uma unica entrega.
Mitigacao: fases independentes com aceite funcional em cada uma.

## Fora Do Escopo Inicial

- Diagnostico medico autonomo.
- Garantia de acuracia laboratorial sem validacao externa.
- Integracao com plataformas pagas externas sem decisao comercial.
- Processamento offline completo no aparelho.
- Analise 3D real por multiplas cameras na primeira versao.

## Criterios De Sucesso

- Fisioterapeuta consegue concluir uma avaliacao completa sem sair do app professional.
- Midia, metricas, anotacoes, laudo e assinatura ficam ligados ao paciente.
- Processamento e falhas sao visiveis e recuperaveis.
- Comparacao longitudinal e clara para decisao clinica.
- O sistema suporta crescimento para pose IA real sem refazer as telas principais.
- Dados sensiveis seguem isolamento por organizacao, auditoria e politicas LGPD.
