# Gates de cobertura greenfield

## Finalidade

Garantir que a reconstrução cubra as capacidades e regras descobertas sem copiar dados do sistema atual. Os inventários e ledgers AS-IS são evidência de comportamento; não são plano de importação, retenção de dados ou autorização de acesso ao conteúdo legado.

## Baseline de evidência

| Classe | Fonte AS-IS | Total auditado | Uso no greenfield |
|---|---|---:|---|
| tabelas | `reconstruction-dossier/inventories/database-objects.csv` (`kind=table`) | 303 | descobrir conceitos, regras e lacunas; nunca copiar linhas |
| regras | `reconstruction-dossier/inventories/business-rules.json` | 108 | decidir e testar paridade comportamental |
| endpoints | `reconstruction-dossier/inventories/api-endpoints.csv` | 1.191 | identificar jornadas e contratos a substituir |
| integrações | `reconstruction-dossier/inventories/integrations.csv` | 34 | decidir manter, substituir ou não portar; nunca reutilizar secrets |
| objetos de banco | `database-objects.csv` | 5.838 | evidenciar constraints, policies e automações relevantes ao alvo |
| blobs | buckets/R2 e metadados do banco | não aplicável | não inventariar, copiar, hashear, exportar ou reconciliar conteúdo atual |

Mudança posterior no legado não cria delta nem reabre migração de dados. Somente uma regra ou comportamento novo comprovadamente relevante atualiza o dossiê e os testes alvo.

## Estados de decisão funcional

Cada regra, endpoint, integração ou conceito recebe uma decisão para o produto novo:

- `preserve`: reproduzir o comportamento válido;
- `correct`: manter a finalidade corrigindo segurança, consistência ou UX;
- `replace`: atender a finalidade por um contrato novo;
- `defer_experiment`: incluir no roadmap, mas liberar somente após validação;
- `do_not_port`: capacidade excluída, órfã ou sem valor alvo;
- `pending`: decisão ainda não aceita.

Esses estados tratam de **comportamento**, nunca de linhas, documentos, mídia ou blobs. Todo o conjunto de dados atual tem uma única disposição: não copiar.

## Gate GF-DATA-01 — origem limpa

O gate falha se existir qualquer mecanismo de transporte dos dados atuais:

- dump, snapshot, branch, export, import, CDC, carga bulk, delta ou reconciliação;
- manifesto ou cópia de blobs atuais;
- conexão de runtime ao banco ou buckets legados;
- reaproveitamento de ID, token, secret, OTP, sessão ou credencial externa;
- fixture derivada de paciente, profissional, mensagem, documento ou transação real.

O banco alvo deve ser recriável do zero por migrations. Após a aplicação do schema, somente dados de referência aprovados e seeds explicitamente sintéticos podem existir antes do piloto.

## Gate GF-SEED-01 — fixtures sintéticas

- factories geram pelo menos duas organizações e personas de todos os papéis suportados;
- nomes, contatos, documentos, prontuários, mídias e transações são fictícios e marcados como sintéticos;
- IDs são imprevisíveis e não repetem identificadores do legado;
- cenários reproduzem formas e inconsistências necessárias aos testes, nunca o conteúdo original;
- há comando de reset integral e verificação de que nenhum dado real entrou no ambiente;
- logs, traces, screenshots, exemplos e snapshots de teste passam por scanner de PII/PHI.

## Gate EVD-01 — cobertura dos inventários

O conjunto das 303 tabelas permanece congelado como índice de evidência. A igualdade entre inventário e ledger deve ser verificável para impedir que um conceito desapareça silenciosamente, mas os campos de migração do ledger não autorizam cópia de dados.

O gate exige:

1. 303/303 nomes presentes uma única vez no índice de evidência;
2. vínculo de cada família relevante com um domínio, regra, jornada ou decisão de não portar;
3. zero requisito de mapeamento linha→linha ou origem→destino;
4. zero script que leia conteúdo das tabelas para alimentar o novo banco;
5. decisão funcional aceita antes de encerrar a análise do domínio.

## Gate RULE-01 — 108 regras

`rule-parity-ledger.csv` deve conter exatamente os 108 IDs do JSON, uma vez cada. Antes de concluir o domínio, cada regra precisa de:

- disposição alvo aceita (`preserve`, `correct`, `replace`, `defer_experiment` ou `do_not_port`);
- teste automatizado ou justificativa aprovada de não portar;
- vínculo com uma jornada de `delivery/parity-tests.md`;
- owner e evidência sanitizada.

`BR-AGENDA-006`, ligada a atendimento em grupo, permanece `do_not_port`, vinculada a `DEC-001` e ao teste negativo de ausência. Evidência clínica do legado nunca é material de fixture.

## Gate API-01 — 1.191 endpoints como evidência

Cada endpoint AS-IS recebe `replace`, `merge`, `evidence_only`, `do_not_port` ou `pending`. O gate falha se:

- uma jornada relevante não possuir contrato alvo ou decisão aceita;
- um endpoint órfão for portado por inércia;
- uma rota pública alvo não possuir ameaça, autenticação/anti-bot, rate limit e teste negativo;
- qualquer `/api/groups/*` não estiver `do_not_port`;
- qualquer rota DICOM/PACS, upload, viewer ou integração equivalente existir no alvo;
- o novo runtime encaminhar chamadas ao backend legado.

## Gate INT-01 — integrações limpas

- 34/34 integrações classificadas como substituir, recriar com credencial nova, evidência apenas ou não portar;
- nenhum secret, OAuth token, webhook secret ou ID de capacidade do legado é reutilizado;
- integrações mantidas são configuradas em contas/ambientes novos e exercitadas com dados sintéticos;
- conteúdo original/licenciado registra origem, licença, versão, validade e autorização de publicação;
- DICOM/PACS não possui conector, SDK, dependência, bucket, rota ou placeholder.

## Gate MOD-01 — módulos completos

Cada módulo incluído precisa de charter próprio, owner, contrato, modelo de permissões, eventos, observabilidade, documentação e pacote de aceitação ponta a ponta. O gate cobre:

- clínico, agenda e relacionamento;
- ERP financeiro completo;
- projetos e time tracking;
- marketing, CRM e site builder;
- loja, inventário, moedas reais, moedas virtuais e leaderboard;
- SaaS completo: onboarding/provisioning, assinatura e billing, entitlements, metering/quotas, administração multi-tenant, suporte e SLO;
- white-label, incluindo estratégia operacional de app compartilhado ou apps por marca;
- telemedicina e NFS-e;
- colaboração;
- IA e agentes;
- biomecânica e pose;
- wearables;
- Digital Twin;
- conteúdo original/licenciado;
- web desktop, app iPhone profissional e app iPhone paciente.

Um módulo não é considerado completo apenas por possuir telas. Precisa fechar sua jornada principal, exceções, autorização, auditoria, contratos, acessibilidade, recuperação e testes nos clientes aplicáveis. Módulos podem permanecer atrás de feature flag até cumprir o gate, mas não desaparecem do roadmap aprovado.

### Subgate SaaS/white-label

- onboarding cria organização, owner elegível, configuração e recursos de modo idempotente, com rollback/compensação quando falhar;
- catálogo, plano, assinatura e entitlements são versionados; entitlement habilita produto, mas nunca concede authorization;
- billing cobre cobrança, pagamento, inadimplência, upgrade/downgrade, cancelamento, crédito, retry e reconciliação;
- metering e quotas são determinísticos, auditáveis e isolados por tenant, com alertas e degradação segura antes de bloqueio destrutivo;
- console multi-tenant e suporte não concedem leitura clínica implícita; acesso excepcional é temporário, justificado e auditado;
- SLO, incidentes, status, comunicação e runbooks possuem owner por plano/jornada;
- white-label isola tema, domínio, assets, e-mails, documentos e portal;
- a decisão entre app compartilhado e binário por marca registra bundle ID, conta Apple, build, revisão, atualização, suporte, custo e plano de descontinuação.

## Gate SCOPE-01 — exclusões definitivas

Testes de ausência verificam que não existem:

- grupos, turmas, aulas coletivas, matrículas ou waitlist coletiva;
- DICOM, PACS, worklist, viewer ou ingestão de imagens médicas nesses padrões;
- tabelas, colunas, enums, rotas, eventos, permissões, telas, menus, flags, traduções, dependências ou placeholders dessas capacidades.

Salas físicas de atendimento e salas de telemedicina continuam válidas e não equivalem a grupos/turmas ou PACS.

## Gate PROD-DATA-01 — autorização para dados reais

Antes de qualquer dado real, inclusive em piloto:

- PITR do Postgres está ativo e com retenção aprovada;
- backups e versionamento/lifecycle de objetos estão ativos;
- restore drill integrado recupera banco, objetos e auditoria e reconcilia referências/hashes;
- RPO/RTO, alertas, contatos, runbook e owner estão registrados;
- o ambiente real está separado dos seeds sintéticos;
- LGPD, consentimento, retenção, exportação e exclusão foram validados.

Falha em qualquer item restringe o ambiente a dados sintéticos. Esse gate não cria obrigação de backup dos dados atuais descartáveis.

## Evidência de aprovação

Relatórios registram somente totais, IDs técnicos permitidos, versões, executor, timestamp, resultado e decisão de exceção. Não incluem dumps, linhas, blobs, PII/PHI ou secrets. Exceção possui prazo e owner; não existe `--force` silencioso para dados reais, grupos/turmas ou DICOM/PACS.
