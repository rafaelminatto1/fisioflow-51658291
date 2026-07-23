# Estratégia greenfield de dados e ativação

## Objetivo

Iniciar a nova plataforma em um banco canônico vazio, criado exclusivamente pelas migrations do novo repositório. Os dados do sistema atual são dados de desenvolvimento e **não serão migrados, exportados, copiados, reconciliados nem preservados em backup**.

O legado permanece somente como evidência de regras de negócio, jornadas, permissões, integrações e comportamentos que precisam ser preservados, corrigidos, substituídos ou explicitamente excluídos.

## Decisão de dados

- não criar dump, snapshot, branch, backup ou manifesto de blobs do banco atual;
- não executar importação, backfill, CDC, carga bulk, delta ou reconciliação entre bancos;
- não transportar pacientes, prontuários, documentos, mídias, eventos, mensagens, credenciais, tokens, secrets ou identificadores do legado;
- criar o banco novo vazio por migrations versionadas;
- popular desenvolvimento, testes, demonstrações e staging apenas com seeds, factories e fixtures sintéticos identificáveis;
- ativar PITR, backups, versionamento de objetos e testes de restauração **antes** de admitir qualquer dado real no sistema novo.

Essa decisão elimina a migração de conteúdo, mas não elimina a obrigação de estudar o legado. Inventários e ledgers continuam sendo evidência de cobertura funcional e não autorização para copiar dados.

## Escopo funcional consolidado

O alvo contempla módulos completos e ativáveis por organização:

- núcleo clínico, agenda e relacionamento com paciente;
- ERP financeiro completo;
- projetos e time tracking;
- marketing, CRM e site builder;
- loja, inventário, moedas reais, moedas virtuais e leaderboard;
- SaaS completo: onboarding/provisioning, assinatura e billing, catálogo de módulos, entitlements, metering/quotas, administração multi-tenant, suporte e SLO;
- white-label de marca, domínio, comunicações, portais e estratégia de apps por marca;
- telemedicina e NFS-e;
- colaboração;
- IA e agentes com supervisão;
- biomecânica, pose, wearables e Digital Twin;
- conteúdo original ou devidamente licenciado;
- web desktop, app iPhone profissional e app iPhone paciente.

Exclusões definitivas, sem entidade, rota, tela, flag ou placeholder no alvo:

- grupos, turmas, aulas coletivas, matrículas e waitlist coletiva;
- DICOM e PACS.

## Princípios

- a fonte de verdade do novo produto nasce no schema canônico novo;
- nenhuma conexão do novo runtime aponta para o banco ou buckets do legado;
- exemplos, logs e fixtures nunca contêm dados reais;
- dado sintético possui marcador de origem e pode ser apagado antes do piloto;
- identidade, tenancy, RLS, auditoria, consentimento e retenção são implementados antes dos módulos consumidores;
- valores monetários reais e moedas virtuais usam livros separados;
- recursos clínicos avançados só são liberados após validação técnica, clínica e de consentimento;
- IA e agentes atuam por APIs autorizadas, com auditoria, limites, aprovação humana e kill switch;
- o legado é consultado em modo somente leitura para extrair comportamento, nunca conteúdo;
- após a entrada do primeiro dado real, retenção, LGPD, PITR e restauração prevalecem sobre conveniência.

## Fases

### G0 — Constituição de escopo e evidência

- congelar os inventários de tabelas, regras, endpoints, integrações e jornadas como evidência AS-IS;
- classificar cada regra como preservar, corrigir, substituir, experimentar ou não portar;
- converter famílias do legado em requisitos e testes, sem gerar mapeamento de linhas ou campos de dados;
- registrar grupos/turmas e DICOM/PACS como exclusões definitivas;
- aprovar charters e critérios de completude dos módulos incluídos.

### G1 — Modelo canônico e contratos

- definir identidade, organizações, memberships, roles, consentimentos e auditoria;
- definir limites e contratos dos módulos completos;
- separar administração SaaS, assinatura/metering, entitlements, permissions e configuração white-label em contratos explícitos;
- versionar OpenAPI, eventos, enums, timezone, dinheiro e arquivos;
- definir isolamento entre dados clínicos, ERP, projetos, marketing, comércio e engajamento;
- definir modelos próprios para colaboração, telemedicina, wearables, pose, IA e Digital Twin.

Não existe dicionário origem→destino para dados legados. Referências ao legado servem apenas para demonstrar a regra ou jornada que o contrato alvo deve atender.

### G2 — Ambientes limpos e dados sintéticos

1. provisionar projetos e bancos novos sem vínculo com o legado;
2. aplicar migrations do zero e validar drift;
3. criar duas ou mais organizações sintéticas, roles e cenários limite;
4. gerar pacientes, agenda, prontuários, mídia, transações e eventos fictícios por factories reproduzíveis;
5. marcar e verificar toda fixture como sintética;
6. executar testes de RLS, permissões, contratos, concorrência, offline e isolamento;
7. permitir reset integral do ambiente sem dependência externa.

### G3 — Fatias verticais e paridade comportamental

- implementar cada jornada ponta a ponta nos clientes aplicáveis;
- provar comportamento alvo contra regras e evidências do dossiê;
- testar correções deliberadas e testes negativos das capacidades excluídas;
- validar os módulos por seus próprios pacotes de aceitação, não por semelhança visual com o legado;
- validar o ciclo SaaS ponta a ponta: provisionar tenant, contratar/alterar plano, medir uso, aplicar quota, prestar suporte auditado e encerrar sem vazamento entre organizações;
- liberar módulos por feature flag somente após seus gates de completude.

### G4 — Prontidão para dados reais

Antes do primeiro piloto com uma pessoa real:

- remover ou isolar os dados sintéticos do ambiente que receberá dados reais;
- ativar PITR no Postgres e política de backup/retention;
- ativar versionamento/lifecycle dos objetos e garantir vínculo banco↔objeto;
- executar restore drill integrado de Postgres, objetos e auditoria;
- validar RPO, RTO, alertas, contatos e runbooks de incidente;
- provar RLS e permissions com identidades reais de runtime;
- concluir revisão de LGPD, consentimento e App Store privacy labels;
- registrar aprovação Go/No-Go.

Sem evidência de restauração bem-sucedida, o ambiente permanece restrito a dados sintéticos.

### G5 — Ativação gradual

- liberar por organização, módulo e cliente com feature flags;
- executar smoke por persona no web e nos dois apps iPhone;
- acompanhar erros, latência, filas, segurança, aceitação e métricas clínicas aplicáveis;
- manter kill switches para integrações, automações, IA, telemedicina e recursos experimentais;
- aplicar rollback de aplicação sem tentar reabrir ou sincronizar o legado.

## Validações obrigatórias

- banco novo nasce do zero por migrations reproduzíveis;
- zero job, script, credencial ou configuração de importação do legado;
- zero dump, backup, snapshot, manifesto de blobs ou arquivo com dados atuais dentro da entrega;
- fixtures possuem origem sintética comprovável e não reutilizam PII/PHI real;
- organizações sintéticas A/B permanecem isoladas na API e no banco;
- regras inventariadas possuem disposição e teste alvo;
- cada módulo incluído passa seu charter de completude e jornada ponta a ponta;
- web, app profissional e app paciente compilam contra contratos compatíveis;
- grupos/turmas e DICOM/PACS são ausentes em schema, API, eventos, UI, permissões, flags e dependências;
- PITR, backups, versionamento de objetos e restore drill passam antes de dados reais;
- autoria, consentimento, auditoria, retenção e acesso do paciente funcionam para novos registros reais.

## Evidência legada permitida

Podem ser preservados no dossiê, sem conteúdo real:

- nomes e estruturas técnicas inventariadas;
- regras de negócio e decisões de produto;
- contratos e formatos sanitizados;
- diagramas, jornadas e matrizes de permissão;
- contagens agregadas e hashes técnicos sem capacidade de reidentificação;
- descrições de falhas e testes de regressão.

Não podem integrar o novo produto: linhas do banco atual, blobs, exports, tokens, secrets, payloads reais, logs com PII/PHI ou cópias de conteúdo sem licença.

## Evolução futura do schema

Depois que o sistema novo receber dados reais, migrations compatíveis entram antes do código consumidor; backfill interno é job observável e idempotente; leitura muda depois; remoção ocorre somente após telemetria, retenção e janela aprovadas. Migration destrutiva nunca acompanha um deploy que ainda depende do campo antigo.
