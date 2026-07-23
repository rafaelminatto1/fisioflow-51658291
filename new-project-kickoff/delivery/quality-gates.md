# Gates de qualidade

## Por pull request

- format/lint/typecheck;
- unit e contract tests;
- OpenAPI lint + breaking change; gerar o SDK e compilá-lo contra web, app profissional e app paciente quando esses consumidores existirem;
- migration lint/drift + verificação de completude RLS/grants para toda tabela tenant-scoped (`owner`, `rolbypassrls`, `relrowsecurity`, `relforcerowsecurity`, policies por operação e privileges);
- secret/PII scan e dependency audit;
- permission/RLS tests do módulo alterado, mantendo separadas as matrizes de permissão funcional e escopo de dados;
- lint de fronteiras de módulo e de `packages/db`, incluindo package exports e proibição de imports internos transversais;
- contract tests de cache/CSRF, cursor opaco vinculado a tenant+filtros+ordenação e semântica `403`/`404` anti-enumeração;
- teste concorrente de `Idempotency-Key`, incluindo mesma chave+mesmo hash e mesma chave+hash diferente;
- canário sintético de redaction em logs, traces e erros, sem PHI em payloads de observabilidade;
- bundle/performance budget aplicável;
- accessibility checks em UI;
- nenhum log/example/fixture com dado real;
- scanner greenfield confirma ausência de dump, snapshot, export, import, CDC, manifesto de blobs, conexão ou credencial do legado;
- seeds/factories são identificados como sintéticos, reproduzíveis e apagáveis;
- testes negativos confirmam ausência de grupos/turmas e DICOM/PACS em schema, API, eventos, UI, flags e dependências.

## Para staging

- migrations aplicadas por role migrator;
- smoke `/health`, `/me` e jornada alterada;
- provar que os logins reais de auth resolver, staff, paciente e jobs são `NOBYPASSRLS`, não são owner e possuem apenas grants esperados;
- testes Org A/B pela API e por conexão direta de cada runtime aplicável;
- testes de pool reuse após commit, rollback e exceção, inclusive request sem contexto, para provar ausência de GUC residual;
- auth matrix com membership `pending`, suspensa, revogada e múltiplas memberships, além de vínculo paciente revogado e versão de autorização antiga;
- integração Queue/Workflow/R2 no ambiente real de staging; outbox cobre duplicação, reordenação, replay, DLQ e receipt transacional com a role de jobs;
- confirmar `private, no-store` e ausência de PHI em cache compartilhado/edge;
- replay offline após revogação deve falhar sem aplicar efeito;
- observabilidade e alertas recebem sinal;
- rollback de app conhecido;
- banco é recriado do zero somente por migrations do novo repositório;
- dataset contém apenas referências aprovadas e fixtures sintéticas, sem cópia ou transformação de conteúdo legado;
- pacote de aceitação do módulo alterado passa conforme `parity-tests.md` e seu charter de completude.

## Para produção web/API

- aprovação de produto + segurança proporcional ao risco;
- antes do primeiro dado real, PITR, backups e políticas de retenção estão ativos; isso não exige nem autoriza backup dos dados atuais descartáveis;
- restore drill integrado recupera Postgres, objetos R2 e trilha de auditoria e reconcilia referências/hashes;
- RPO/RTO, alertas, contatos de incidente, runbook e owner estão aprovados;
- ambiente que receberá dados reais não contém seeds de demonstração confundíveis com pessoas reais;
- canary/gradual deploy;
- smoke por role;
- inventário comprova Workers web/API/jobs separados e que o Worker web não possui binding/secret clínico;
- erro/latência/fila dentro do orçamento;
- runbook e owner;
- kill switch para automação/IA.

Falha de PITR, backup, versionamento de objetos ou restore drill mantém o ambiente restrito a dados sintéticos.

## Para iOS

- compatibilidade de API e runtimeVersion;
- buildNumber/version corretos;
- device tests e TestFlight;
- crash reporting/source maps;
- permissions/consentimento/deep links/push revisados;
- datastore clínico persistente criptografado; credencial/chave em Keychain/SecureStore e teste de destruição da chave;
- offline conflict, replay após revogação, token revocation e cache wipe best effort;
- fila mostra estado pendente/erro quando background sync não executa;
- App Store privacy labels coerentes.

## Gates clínicos/IA

- caso de uso, limite e responsável clínico;
- avaliação com conjunto representativo e casos adversos;
- revisão humana e diff;
- fallback sem IA;
- consentimento/retention;
- métrica de aceitação, edição e erro;
- proibição de auto-sign/auto-conduta.

## Gate de módulo completo

Cada módulo aprovado — clínico, ERP, projetos/time tracking, marketing/CRM/site builder, loja, inventário, moedas, leaderboard, SaaS/white-label, telemedicina, NFS-e, colaboração, IA/agentes, biomecânica/pose, wearables, Digital Twin e conteúdo original/licenciado — só sai de feature flag quando possuir:

- charter, owner, limites e modelo de dados aprovados;
- contrato de API/eventos e SDK compatível com os consumidores aplicáveis;
- matriz de permissões, tenancy, auditoria, consentimento e retenção;
- jornada principal e exceções cobertas ponta a ponta;
- idempotência, concorrência, recuperação, observabilidade e runbook;
- acessibilidade e desempenho dentro do orçamento;
- validação clínica/regulatória quando aplicável;
- evidência nos três clientes quando a capacidade for compartilhada: web desktop, app iPhone profissional e app iPhone paciente.

Para SaaS/white-label, o pacote também exige onboarding/provisioning idempotente, assinatura/billing reconciliável, catálogo e entitlements separados de permissions, metering/quotas por tenant, console multi-tenant e suporte auditados, SLO/runbooks e estratégia aprovada para app compartilhado ou apps por marca.

Tela isolada, mock, placeholder ou endpoint sem consumidor não conclui um módulo. O módulo pode ser entregue em releases internas sucessivas, mas permanece incompleto até fechar o pacote inteiro.

## Gate de design conduzido por LLM

- o contrato de experiência declara persona, tarefa, permissões, dados, estados e riscos antes do layout;
- Stitch, Figma e referências externas recebem somente conteúdo sintético;
- Figma MCP oficial é a fonte visual editável; conectores comunitários exigem revisão separada;
- tokens e componentes têm mapeamento rastreável entre Figma e código;
- web e apps cobrem loading, vazio, erro, offline aplicável, sem permissão, conflito e recuperação;
- contraste, teclado, leitor de tela, Dynamic Type, safe areas, targets de toque e motion reduzido passam;
- DevTools/Playwright verificam responsividade, comportamento e regressão visual;
- nenhum layout, texto ou asset de terceiro é copiado sem licença.

## Gate de exclusões definitivas

- grupos, turmas, aulas coletivas, matrículas e waitlist coletiva não existem no alvo;
- DICOM, PACS, worklist, viewer e ingestão nesses padrões não existem no alvo;
- CI falha ao detectar tabela, rota, evento, permissão, menu, flag, tradução, SDK, dependência ou placeholder dessas capacidades;
- salas físicas e salas de telemedicina são permitidas e não representam exceção às exclusões.

## Definition of Done

Contrato + SDK compilado nos consumidores + código + testes + observabilidade/redaction + documentação/runbook + evolução de schema/rollback/restore + permission/RLS/grants com logins reais + fronteiras de módulo + idempotência/replay + acessibilidade + pacote de completude. “Funciona na conta admin” não encerra uma feature.
