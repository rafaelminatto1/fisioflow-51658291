# Testes de paridade e comportamento alvo

Paridade é classificada como:

- **preservar:** comportamento válido e usado;
- **corrigir:** comportamento legado é inseguro/incorreto;
- **simplificar:** mesmo resultado com menos estados/superfícies;
- **adiar:** experimento sem dependência do núcleo;
- **não portar:** fora de escopo, órfão ou mock;
- **novo completo:** módulo novo só é liberado após fechar seu pacote integral de aceitação;
- **experimento validado:** módulo incluído no roadmap, condicionado a evidência técnica/clínica antes da liberação;
- **não portar dados:** comportamento pode servir de evidência, mas nenhum conteúdo legado entra no alvo.

Paridade não é copiar telas, endpoints, bugs ou dados. É provar que toda regra descoberta recebeu uma decisão explícita e que toda jornada mantida possui comportamento verificável no banco greenfield com fixtures sintéticas. O legado é somente evidência; não há dump, importação, reconciliação ou cutover de conteúdo atual.

## Cobertura obrigatória das 108 regras

`../migration/rule-parity-ledger.csv` contém exatamente os 108 IDs de `business-rules.json`. Cada regra possui um ID planejado `PT-<DOMÍNIO>-NNN`, disposição alvo, owner e evidência. `PT-GROUP-01` e `PT-DICOM-01` cobrem as exclusões definitivas. Antes de concluir um domínio:

1. o conjunto de IDs do JSON e do ledger deve ser idêntico, sem duplicatas;
2. `decision_status` deve ser `accepted`;
3. a disposição precisa ser `preserve`, `correct`, `simplify`, `defer_experiment` ou `do_not_port`;
4. o `target_test_id` deve existir como teste automatizado ou apontar para um dos testes de jornada abaixo com a mesma precondição/resultado;
5. `defer_experiment` e `do_not_port` exigem teste de ausência/flag quando aplicável e decisão aceita;
6. falha de cobertura bloqueia a release, conforme `../migration/coverage-gates.md`.

No estado inicial, somente `BR-AGENDA-006` está aceito como `do_not_port` por `DEC-001`; as outras 107 linhas permanecem propostas até validação. Isso é bloqueio deliberado, não lacuna silenciosa.

## Identidade, autorização e tenancy

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-AUTH-01 | token sem membership ativa | 403, sem organização default ou `viewer` | corrigir |
| PT-AUTH-02 | membership suspensa/revogada durante sessão | acesso revogado dentro do SLA; cache invalidado | corrigir |
| PT-AUTH-03 | convite usado por subject/e-mail diferente | rejeitado, auditado e token continua íntegro conforme política | corrigir |
| PT-AUTH-04 | alteração de role | nova permission vale server-side; sessão/cache antigos não mantêm privilégio | corrigir |
| PT-AUTH-05 | payload tenta escolher `organizationId` | ignorado/rejeitado; contexto autenticado prevalece | corrigir |
| PT-AUTH-06 | subject possui múltiplas memberships | lista apenas candidatos próprios; somente membership ativa/elegível selecionada estabelece sessão | corrigir |
| PT-RLS-01 | Org A lê UUID de paciente da B | nenhum dado na API e no DB com runtime NOBYPASSRLS | corrigir |
| PT-RLS-02 | teste executado como owner | suíte falha por configuração inválida, não conta como isolamento | corrigir |
| PT-PACAUTH-01 | paciente A tenta patient B | 404 sem revelar existência, com auditoria; permission global ausente é 403 | corrigir |
| PT-AUDIT-01 | acesso clínico autorizado/negado | ator, subject, org, ação e timestamp append-only, sem conteúdo clínico no log | corrigir |

## Paciente, intake e prontuário

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-PAT-01 | listar/buscar/detalhar paciente | paginação, filtros e campos autorizados | preservar |
| PT-PAT-02 | cadastro com telefone já normalizado E.164 | dedup/merge explícito; não cria duplicata silenciosa | corrigir |
| PT-PAT-03 | pré-cadastro por token válido | uso único, expiração, rate limit e conversão auditada | corrigir |
| PT-PAT-04 | reconciliar os dois trilhos de pré-cadastro | um registro canônico ou conflito para revisão; proveniência preservada | simplificar |
| PT-PAT-05 | recepção abre paciente | somente campos mínimos não clínicos autorizados | corrigir |
| PT-PAT-06 | paciente altera campos próprios | allowlist; nunca troca subject, org ou patient link | corrigir |
| PT-PAT-07 | registro clínico sintético sem episódio confiável | permanece consultável como `unassigned`, sem inventar dado clínico | corrigir |

## Agenda individual e acesso público

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-AGENDA-01 | sobreposição do mesmo profissional | 409 estável e operação atômica | preservar |
| PT-AGENDA-02 | capacidade/sala ocupada | rejeita conflito considerando `rooms`/`salas`; não usa `telemedicine_rooms` | preservar/simplificar |
| PT-AGENDA-03 | série recorrente com conflito parcial | preview e resultado por ocorrência, sem duplicar as válidas em retry | preservar |
| PT-AGENDA-04 | integração envia alias PT/EN/customizado de status | somente mapa aceito produz estado canônico; valor recebido permanece auditável | simplificar |
| PT-AGENDA-05 | mudança de status com efeito financeiro | billing/consumo ocorre uma vez e é reconciliável | preservar |
| PT-AGENDA-06 | feriado, bloqueio ou escala fora do horário | slot indisponível em todos os clientes | preservar |
| PT-AGENDA-07 | booking público com schema/config inconsistente | fail-closed; nunca retorna todos os slots por fallback | corrigir |
| PT-AGENDA-08 | abuso de booking/pré-cadastro/check-in | rate limit/Turnstile conforme ameaça e resposta neutra | corrigir |
| PT-AGENDA-09 | cancelamento abre vaga individual | oferta ordenada/deduplicada; aceite revalida disponibilidade | preservar/simplificar |
| PT-AGENDA-10 | waitlist individual versus turma | apenas vaga de atendimento individual existe | simplificar |
| PT-AGENDA-11 | check-in público | prova suficiente, escopo mínimo e nenhuma enumeração de paciente | corrigir |
| PT-AGENDA-12 | no-show com/sem cobrança | estado e efeito financeiro seguem decisão aceita e são auditáveis | preservar/simplificar |
| PT-AGENDA-13 | lembretes D-2/D-1/same-day | timezone, dedup, preferência e opt-out respeitados | preservar/simplificar |

## Episódio, avaliação, evolução e resultado

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-EPISODE-01 | associar registro sintético a episódio | registra regra/versão/fontes/confiança; ambíguo fica `unassigned` | corrigir |
| PT-EPISODE-02 | encerrar episódio | alta/abandono exige dado explícito e ator autorizado; nunca inferido pelo job | corrigir |
| PT-CLIN-01 | registrar cirurgia/patologia/mapa de dor/exame sintéticos | autoria, datas e vínculos persistidos sem inventar diagnóstico | preservar |
| PT-ASSESS-01 | usar avaliação/template versionado | resposta continua ligada à versão e licença corretas | preservar/simplificar |
| PT-ASSESS-02 | cálculo de PROM/teste | raw input, versão, score e interpretação reproduzíveis | corrigir |
| PT-EVO-01 | retry de autosave | uma mutação lógica | preservar |
| PT-EVO-02 | duas versões concorrentes | conflito/diff, sem overwrite silencioso | preservar/corrigir |
| PT-EVO-03 | finalizar duas vezes | segunda ação rejeitada idempotentemente | preservar |
| PT-EVO-04 | estagiário envia para revisão | estado `under_review`, supervisor autorizado e trilha de decisão | decisão DG-04 |
| PT-EVO-05 | editar após finalização | política explícita, nova versão e marcação/auditoria | preservar/simplificar |
| PT-EVO-06 | ditado sem consentimento ou acima do budget | não grava/processa; fallback manual disponível | corrigir |
| PT-EVO-07 | abrir e versionar documento colaborativo sintético | conteúdo legível, hash/proveniência, histórico e recuperação de conflito | simplificar |
| PT-RADAR-01 | sinal de piora/pendência | causa explicável, severidade, responsável, dedup e ação/dispensa auditada | simplificar |

## Retorno médico, documentos e mídia

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-RET-01 | criar pedido de retorno | prazo, médico, motivo e anexos válidos; estado pendente | preservar |
| PT-RET-02 | pedido ainda não enviado | permanece visível no Radar/fila após reload e novo deploy | preservar |
| PT-RET-03 | gerar/enviar relatório | transição idempotente até `report_sent`; destinatário e envio auditados | preservar/simplificar |
| PT-RET-04 | falha de envio | pedido não é encerrado; retry não duplica mensagem | corrigir |
| PT-DOC-01 | assinatura por token | token escopado, expirável, uso único e documento imutável após assinatura | corrigir |
| PT-DOC-02 | paciente solicita documento próprio | política de liberação e URL temporária; documento alheio invisível | corrigir |
| PT-DOC-03 | persistir documento/exame/mídia sintéticos | metadata, hash, tamanho, classe e blob permanecem vinculados | preservar |
| PT-DOC-04 | blob sem metadata/autorização | é rejeitado ou isolado para revisão; nunca fica público | corrigir |

## Exercícios e HEP

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-HEP-01 | prescrever plano/protocolo | dose, instrução, versão, indicação/contraindicação e autoria preservadas | preservar |
| PT-HEP-02 | execução offline reenviada | um log append-only, feedback preservado | corrigir |
| PT-HEP-03 | QR/link público | token opaco/expirável e exposição mínima conforme decisão | corrigir |
| PT-HEP-04 | paciente informa dor/dificuldade/confiança | entrada própria, sem alterar prescrição automaticamente | preservar/corrigir |
| PT-HEP-05 | lembrete diário | preferência, timezone, quiet hours e opt-out respeitados | preservar/simplificar |
| PT-HEP-06 | exercício sem licença/proveniência | não é publicado na biblioteca ativa | corrigir |

## Financeiro ligado ao cuidado

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-PKG-01 | pacote com total menor que 1 | rejeitado no domínio e banco | preservar |
| PT-PKG-02 | consumo concorrente do último crédito | uma operação vence | preservar |
| PT-PKG-03 | retry do consumo | idempotente; saldo não reduz duas vezes | corrigir |
| PT-PKG-04 | pacote expirado/penúltima sessão | estado/alerta seguem decisão aceita sem efeito duplicado | preservar/simplificar |
| PT-FIN-01 | pagamento/recibo | valor, moeda, status e autoria permanecem consistentes no livro novo | preservar/simplificar |
| PT-FIN-02 | comissão | taxa configurada e payout por período auditáveis; default exige decisão | preservar/simplificar |
| PT-FIN-03 | pagamento em atraso gera tarefa | uma tarefa vinculada, deduplicada e dispensável com motivo | simplificar |
| PT-FIN-04 | configurar e operar convênio | contrato, regras, autorização, cobrança e relatório permanecem rastreáveis | novo completo |
| PT-FIN-05 | integrar voucher, comércio e NFS-e ao financeiro | efeitos entram uma vez nos livros corretos e somente após o gate completo de cada módulo | novo completo |

## Mensageria, consentimento e relacionamento

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-WA-01 | mensagem fora da janela | template aprovado ou recusa conforme política | preservar |
| PT-WA-02 | webhook repetido | uma mensagem/efeito, assinatura validada e status conciliado | corrigir |
| PT-WA-03 | acesso à conversa atribuída | matriz server-side por role/escopo | corrigir |
| PT-WA-04 | mídia acima do limite | rejeitada antes de persistir/processar | preservar |
| PT-CONSENT-01 | opt-out/revogação recebido | bloqueia próximo envio em todos os canais aplicáveis | preservar/corrigir |
| PT-CONSENT-02 | registrar e revogar consentimento novo | origem, finalidade, versão, timestamp e revogação preservados | corrigir |
| PT-CONSENT-03 | descartar campanha/conteúdo | nunca descarta junto consentimento, opt-out ou prova legal | corrigir |
| PT-NPS-01 | pesquisa por token | 0–10, expiração, resposta única e anti-enumeração | preservar/corrigir |
| PT-REF-01 | indicação/recall/reativação | consentimento, dedup e vínculo ao paciente preservados | simplificar |

## Módulos completos obrigatórios

Os módulos abaixo fazem parte do alvo aprovado. Cada ID representa um pacote de aceitação ponta a ponta, com casos felizes, exceções, autorização, auditoria, concorrência, recuperação e clientes aplicáveis; não apenas um smoke de tela.

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-ERP-01 | operar plano de contas, partidas, contas a pagar/receber, centros de custo, orçamento, conciliação e demonstrações | livro balanceado, aprovações auditadas, fechamento reproduzível e segregação por empresa | novo completo |
| PT-PROJ-01 | planejar projeto, dependências, capacidade, tarefa, timesheet, aprovação, custo e faturamento | horas e custos rastreáveis do apontamento ao resultado financeiro, sem acesso cross-org | novo completo |
| PT-MKT-01 | captar lead por site, segmentar, automatizar campanha e atribuir conversão | página publicada no domínio correto, consentimento respeitado e funil/atribuição auditáveis | novo completo |
| PT-SHOP-01 | catálogo/variante → preço → checkout → pagamento → pedido → devolução | totais idempotentes, estado rastreável e integração correta com financeiro e estoque | novo completo |
| PT-INV-01 | fornecedor → compra → recebimento → lote/depósito → consumo/transferência → reposição | saldo físico e contábil consistentes, sem estoque negativo silencioso | novo completo |
| PT-CURRENCY-01 | transacionar moeda real e conceder/resgatar moeda virtual | livros isolados, regras de expiração/fraude auditadas e nenhuma mistura contábil | novo completo |
| PT-LEADER-01 | aderir a desafio e atualizar leaderboard | participação opt-in, privacidade por escopo, cálculo reproduzível e possibilidade de saída | novo completo |
| PT-WL-01 | aplicar marca, domínio, e-mail, documentos e configuração de uma organização | isolamento entre marcas, fallback seguro e nenhum vazamento de configuração | novo completo |
| PT-SAAS-01 | concluir onboarding e provisioning de nova organização | tenant, owner elegível, configuração, recursos e auditoria nascem idempotentemente; falha parcial é compensada | novo completo |
| PT-SAAS-02 | contratar, alterar e cancelar assinatura SaaS | plano, cobrança, pagamento, crédito, inadimplência, upgrade/downgrade e cancelamento permanecem reconciliáveis | novo completo |
| PT-SAAS-03 | aplicar catálogo, entitlements, metering e quotas | uso é atribuído ao tenant correto, entitlement não vira permission e limite degrada com aviso sem corrupção de dados | novo completo |
| PT-SAAS-04 | operar console multi-tenant e atendimento de suporte | busca não enumera outros tenants; sessão assistida/break-glass é temporária, justificada e auditada sem acesso clínico implícito | novo completo |
| PT-SAAS-05 | medir SLO e conduzir incidente por plano/jornada | violação gera alerta, owner, status/comunicação, runbook e evidência de resolução | novo completo |
| PT-WL-02 | publicar app compartilhado ou app por marca | branding, bundle ID, conta Apple, build, revisão, atualização, suporte e descontinuação seguem a estratégia aprovada sem misturar tenants | novo completo |
| PT-TELE-01 | agendar, consentir, entrar, conduzir e encerrar teleatendimento | sala escopada, acesso temporal, eventos auditados e gravação/retention conforme política | novo completo |
| PT-NFSE-01 | configurar, emitir, consultar, cancelar e reconciliar NFS-e em sandbox | retry idempotente, contingência explícita, status fiscal rastreável e vínculo ao ERP | novo completo |
| PT-COLLAB-01 | editar simultaneamente, comentar, mencionar, revisar e aprovar | presença e conflitos consistentes, histórico imutável e autorização revalidada | novo completo |
| PT-AI-01 | agente propõe e executa ação permitida após aprovação | ferramenta allowlisted, contexto mínimo, avaliação, auditoria, limite, fallback e kill switch | novo completo |
| PT-BIOMECH-01 | capturar pose em cenário calibrado e calcular métrica | qualidade de captura visível, métrica reproduzível, versão do modelo e nenhuma conduta automática | experimento validado |
| PT-WEAR-01 | consentir e sincronizar dados HealthKit/wearable | dedup, timezone, proveniência, revogação e política de retenção corretos | experimento validado |
| PT-TWIN-01 | gerar e atualizar representação longitudinal | fontes, versão, confiança e limitações explicáveis; revisão clínica antes de qualquer uso assistencial | experimento validado |
| PT-CONTENT-01 | criar, revisar, licenciar, versionar e publicar conteúdo | autoria, fonte, licença, validade, escopo e retirada de publicação demonstráveis | novo completo |

## Mobile e offline

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-MOB-01 | logout offline | token, cache, mídia, fila e push registration apagados | corrigir |
| PT-MOB-02 | troca/revogação de membership | namespace antigo fica inacessível e é limpo | corrigir |
| PT-MOB-03 | rascunho conflita com versão finalizada | rejeição/diff; conteúdo local preservado para revisão | corrigir |
| PT-MOB-04 | push em tela bloqueada | nenhuma PHI/PII no payload ou preview | corrigir |
| PT-MOB-05 | deep link para recurso alheio/revogado | autentica, revalida permissão e não revela existência | corrigir |
| PT-MOB-06 | cold start offline | somente cache autorizado e dentro do TTL fica disponível | corrigir |

## Inicialização greenfield e exclusões

| ID | Jornada | Resultado alvo | Classe |
|---|---|---|---|
| PT-GF-01 | criar ambiente a partir de banco vazio | migrations produzem schema esperado sem conexão, dump ou dependência do legado | corrigir |
| PT-GF-02 | procurar mecanismo de transporte do legado | nenhum dump, snapshot, export, import, CDC, bulk, delta, manifesto de blobs ou reconciliação existe | não portar dados |
| PT-GF-03 | carregar seed de desenvolvimento/staging | somente referências aprovadas e fixtures comprovadamente sintéticas são criadas | corrigir |
| PT-GF-04 | configurar integração substituta | credenciais e IDs são novos; nenhum token/secret/OAuth do legado é transplantado | corrigir |
| PT-GF-05 | tentar admitir dado real sem proteção | bloqueado até PITR, backups, versionamento de objetos e restore drill passarem | corrigir |
| PT-GF-06 | usar inventários AS-IS | regras e jornadas alimentam testes, sem ler conteúdo para popular o banco novo | corrigir |
| PT-GROUP-01 | procurar grupo/turma/aula coletiva/matrícula/waitlist coletiva no alvo | capacidade, tabela, rota, flag e placeholder inexistentes | não portar |
| PT-DICOM-01 | procurar DICOM/PACS/worklist/viewer/ingestão no alvo | capacidade, schema, rota, dependência, bucket, flag e placeholder inexistentes | não portar |

## Personas obrigatórias

Clinic admin, clinical lead, recepção, fisioterapeuta, estagiário e paciente. Testar tanto caminho permitido quanto tentativa direta à API. Runtime administrativo sozinho não é cobertura. Jobs e integrações são testados com service identity restrita.

## Dados de teste

Fixtures sintéticas com duas organizações, IDs imprevisíveis, pacientes semelhantes entre tenants e estados limite. Nunca copiar pacientes reais nem qualquer outro conteúdo do legado. Geradores reproduzem apenas formas e inconsistências necessárias aos testes, com dados fictícios marcados; o ambiente que receber dados reais é limpo e protegido por PITR/backups/restore antes do piloto.
