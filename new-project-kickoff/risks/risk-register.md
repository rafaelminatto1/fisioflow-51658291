# Registro inicial de riscos

Escala: probabilidade/impacto `B`, `M`, `A`.

| ID | Risco | P | I | Mitigação / gate |
|---|---|---:|---:|---|
| R-01 | o programa completo virar um único release impossível de validar | A | A | decompor por módulo/incremento, dependências, owner, aceite e entitlement; limitar WIP sem retirar módulos do roadmap |
| R-02 | RLS continuar decorativa por role owner ou contexto vazar no pool | M | A | logins reais NOBYPASSRLS, capabilities NOLOGIN, FORCE RLS, grants mínimos e testes A/B + pool reuse |
| R-03 | auth staff/paciente se fragmentar ou aceitar vínculo revogado/tenant errado | M | A | bootstrap em duas etapas, sessão interna versionada e spike com pending/suspended/revoked/múltiplas memberships |
| R-04 | regras importantes do legado se perderem mesmo sem migração de dados | M | A | dossiê, classificação requisito/hipótese/obsoleto e testes de paridade com fixtures sintéticas |
| R-05 | IA gerar nota, conduta ou comunicação incorreta | M | A | draft+diff+human approval+evaluation+fonte+kill switch |
| R-06 | app offline vazar dado ou executar ação após revogação | M | A | datastore criptografado, chave protegida, replay reautorizado, version conflict, TTL/wipe best effort e threat model |
| R-07 | excesso de alertas aumentar carga | A | M | Radar consolidado, severidade, dedup e medir ação/falso positivo |
| R-08 | HEP aumentar adesão só no curto prazo | M | M | medir por coorte, personalizar e preservar contato humano |
| R-09 | duas pipelines iOS divergirem | M | M | EAS canônico, packages/SDK compartilhados; GH macOS somente quando necessário |
| R-10 | lock-in de primitiva Cloudflare espalhar no domínio | M | M | ports/adapters e critérios explícitos por Queue/Workflow/DO/R2 |
| R-11 | eventos duplicarem, reordenarem ou repetirem efeitos no replay | M | A | outbox, dispatcher com role jobs, receipt transacional por consumer/event, ordenação explícita, replay tests e DLQ |
| R-12 | paciente interpretar app/chat/IA como emergência | M | A | linguagem, triagem, SLA e canais de urgência claros em cada superfície |
| R-13 | conteúdo, exercícios ou instrumentos sem licença | M | A | proveniência, revisão e biblioteca original/licenciada; nenhum simples parafraseamento de fonte protegida |
| R-14 | ERP/NFS-e produzir inconsistência contábil ou fiscal | M | A | ledger de dupla entrada, períodos, estorno, reconciliação, aprovação contábil e adapter de provedor testado |
| R-15 | iniciar dados reais acreditando que “sem backup” vale para a nova produção | M | A | gate impede dados reais antes de PITR/backup, lifecycle R2 e restore integrado comprovados |
| R-16 | base de conhecimento virar cópia indevida | M | A | iniciativa editorial separada, licença/proveniência e conteúdo original revisado |
| R-17 | falta de usuários não-admin na validação | A | A | testes e sessões por persona antes de cada liberação |
| R-18 | telemetria registrar PHI ou payload de agente | M | A | schema de logs, allowlist, referências opacas, canário sintético de redaction e testes em logs/traces/crash |
| R-19 | superfície pública ampliar blast radius de segredo, cache ou acesso clínico | M | A | `public-edge` isolado, sem binding clínico, comandos estreitos, inventário de bindings e cache policy testada |
| R-20 | bootstrap circular aplicar tenant antes de provar membership | M | A | resolver interno mínimo, troca em duas etapas e sessão vinculada a membership/link verificado |
| R-21 | runtime de request alterar outbox/auditoria com grants excessivos | M | A | capability roles NOLOGIN, writers separados, grants testados e dispatcher com credential própria |
| R-22 | imports de banco atravessarem módulos e recriarem monólito acoplado | A | M | exports por módulo, lint de boundaries, contratos e read models com owner/rebuild |
| R-23 | restore recuperar Postgres mas perder objetos ou trilha auditável | M | A | drill integrado Neon+R2+audit com reconciliação de referências e hashes |
| R-24 | cursor, erro, cookie ou form público permitir enumeração/CSRF/abuso | M | A | cursor opaco tenant-bound, semântica 403/404, Origin/CSRF, Turnstile/rate limits e contract tests |
| R-25 | idempotência falhar sob requests concorrentes | M | A | claim atômico, hash de request, resposta persistida e teste concorrente |
| R-26 | separar serviços cedo criar transações distribuídas desnecessárias | M | A | monólito modular por default; extração exige gate de segurança/runtime/escala/RPO-RTO/falha/ownership |
| R-27 | monólito modular crescer sem isolamento de falha ou ciclo de release | M | A | module registry, budgets, observabilidade por módulo e revisão periódica dos gates de extração |
| R-28 | marketing usar consentimento clínico ou PHI para segmentação indevida | M | A | purposes/consents/opt-outs separados, policy engine, auditoria e bloqueio de campos clínicos por default |
| R-29 | site builder permitir XSS, upload malicioso ou vazamento cross-tenant | M | A | blocos/schema fechados, sanitização, CSP, scanning, assets/domínios isolados, preview e rollback |
| R-30 | ledger de estoque ficar negativo ou divergir de commerce/ERP | M | A | movimentos append-only, reserva atômica, locks/idempotência, contagem e reconciliação |
| R-31 | projetos/tarefas copiarem PHI para campos e integrações menos protegidos | M | A | referências opacas, DLP/validação, permissions e nenhuma incorporação automática de prontuário |
| R-32 | gamificação constranger paciente, expor saúde ou distorcer cuidado | M | A | opt-in/pseudônimo, privacidade, elegibilidade, moderação e proibir efeito em prioridade/outcome/acesso |
| R-33 | agente executar pagamento, fiscal, marketing ou alteração clínica irreversível | M | A | tools com capability/limite, simulação prévia, approval humano, idempotência, audit trail e kill switch |
| R-34 | colaboração realtime perder update ou divergir da versão assinada | M | A | DO apenas para coordenação, snapshots/version vectors, finalize no Clinical e testes multiusuário/falha |
| R-35 | telemedicina ou gravação falhar em privacidade/continuidade | M | A | provider adapter, consentimento separado, sala de espera, URLs/tokens curtos, retenção e fallback operacional |
| R-36 | wearables/pose misturarem dado bruto, derivado e interpretação não validada | M | A | fonte/unidade/algoritmo/qualidade/proveniência, rótulo experimental, revisão clínica e kill switch |
| R-37 | Digital Twin parecer previsão clínica comprovada | M | A | versionamento, incerteza/evidência visíveis, protocolo experimental e nenhuma prescrição autônoma |
| R-38 | custo de Cloudflare, Neon, IA, mídia e automações crescer sem limite | M | M | budgets/quotas por tenant/módulo, metering, alertas, limites e degradação segura |
| R-39 | seed sintético ou fixture contaminar a nova produção | M | M | ambientes/credenciais separados, marcador de dataset, checks de deploy e remoção validada antes do Go/No-Go |
| R-40 | grupos/turmas ou DICOM/PACS retornarem por código genérico/placeholder | B | M | exclusões em ADR/schema/backlog, lint/review de nomenclatura e nenhum entitlement reservado |
| R-41 | Stitch, Figma, plugin ou MCP receber PII/PHI, secret ou documento real | M | A | MCP oficial, escopos mínimos, projeto isolado, dados sintéticos, revisão de prompts/assets e nenhum acesso ao legado |
| R-42 | layout gerado por IA ficar genérico, inacessível ou divergir do código | A | M | três direções, rubrica explícita, design system, Code Connect/mapeamento, testes visuais/a11y e round-trip UI↔Figma |

Revisar o registro a cada gate de release. Risco sem owner, evidência e data de revisão não pode ser aceito silenciosamente.
