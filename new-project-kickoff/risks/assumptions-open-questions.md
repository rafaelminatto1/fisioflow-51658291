# Premissas e perguntas abertas

## Premissas atuais

- a operação inicial é uma clínica e permanece multi-tenant-ready, ainda que a UI SaaS possa vir depois;
- atendimento é individual; grupos/turmas estão excluídos definitivamente;
- DICOM/PACS está excluído definitivamente; documentos, fotos e vídeos clínicos comuns continuam permitidos sob Documents;
- o web desktop vem antes dos apps e é a superfície funcional completa;
- os apps são distribuídos inicialmente para iPhone e expõem capacidades por persona, não paridade de menus com o web;
- ERP, projetos/time tracking, CRM/marketing/site builder, commerce/inventory, gamificação, telemedicina, NFS-e, colaboração, IA/agentes, biomecânica, wearables e Digital Twin fazem parte do roadmap completo;
- escopo completo significa incrementos modulares com gates, não um único release;
- Cloudflare + Neon e a plataforma modular híbrida estão aceitos;
- o monólito modular transacional é o default; `public-edge`, `jobs-integrations`, `realtime`, `ai` e `telehealth` nascem somente junto de uma capacidade que justifique o deployable;
- Neon é a fonte transacional; R2 guarda blobs/asset, Queues/Workflows efeitos assíncronos e Durable Objects coordenação realtime;
- runtimes Neon usam logins reais `NOBYPASSRLS` que herdam capacidades `NOLOGIN`; o grafo exato de roles e provisionamento ainda precisa de spike;
- contexto RLS só é confiável quando deriva do bootstrap interno e é aplicado localmente na mesma transação/conexão;
- os registros atuais não são reais e serão descartados; não haverá backup, dump ou migração desses registros;
- regras, jornadas, contratos e evidências do legado continuam sendo insumos da reconstrução;
- a nova produção não recebe dados reais antes de PITR/backup e restore integrado estarem testados;
- dados de saúde e autoria clínica exigem retenção/auditoria revisadas juridicamente;
- IA, agentes, biomecânica e Digital Twin não substituem o profissional;
- qualquer base de conhecimento/exercício usa conteúdo original ou licenciado.

## Bloqueantes do scaffold

1. Quem será owner de produto e responsável clínico das decisões?
2. Qual fornecedor/fluxo de auth passa o spike staff+patient+revocation+RLS?
3. Qual será o resolver mínimo do bootstrap identidade → memberships/vínculo paciente e quais claims entram na sessão interna?
4. Qual topologia de owner/capability/login roles, provisionamento e bindings passa os testes no Neon, inclusive auth e jobs?
5. Quais papéis finais e regra de supervisão de estagiário?
6. Quais contas Cloudflare/Neon/Expo/Apple e domínios serão usados pelo produto novo?
7. Qual observabilidade e quais dados podem sair da infraestrutura principal?
8. O primeiro slice `auth → seleção de membership → patients list/detail` está aprovado?
9. Qual ordem de entrega dos módulos completos e qual equipe/capacidade sustentará cada incremento?

## Antes do núcleo clínico

1. Definição de episódio, alta e abandono.
2. PROMs/testes iniciais e licença dos instrumentos.
3. Conteúdo mínimo de evolução e o que o paciente pode ver.
4. Política de áudio/ditado e tempo de retenção.
5. Quando estagiário envia `under_review` e quem assina.
6. Quais regras do Radar geram tarefa versus apenas informação.

## Antes dos módulos de negócio

1. Qual localização contábil/fiscal, plano de contas, competência, moeda e política de fechamento serão canônicos?
2. Quem possui segregação de funções para lançar, aprovar, pagar, conciliar e estornar?
3. Qual provedor/adapter de NFS-e e quais municípios entram primeiro?
4. Projetos/time tracking atendem equipe interna, clientes externos ou ambos?
5. Commerce vende serviços, produtos físicos, assinatura e itens virtuais em quais canais?
6. Quais unidades, locais, lote/validade, custo e políticas de estoque são necessários?
7. Quais canais de marketing, bases legais, frequência, domínios e responsabilidades editoriais entram primeiro?
8. Quais capacidades white-label se limitam ao web e quais exigiriam distribuição nativa separada?
9. Quais regras impedem gamificação de expor saúde, constranger pacientes ou influenciar prioridade assistencial?

## Antes dos apps

1. Apple Developer Program/contas e bundle IDs.
2. Login paciente: passkey/e-mail/telefone e recuperação segura.
3. Ações offline exatas e TTL do cache.
4. Qual datastore criptografado será usado e como rotação/destruição da chave será validada em iOS?
5. Política de BYOD, aparelho perdido e limites reais do wipe offline.
6. O paciente pode agendar ou apenas solicitar/remarcar?
7. Existe modo cuidador no primeiro release?
8. Quais capabilities de ERP/projetos/CRM/estoque o profissional realmente precisa em movimento?
9. Quais leituras/escritas HealthKit entram primeiro e como consentimento/revogação serão exibidos?

## Antes das superfícies públicas

1. Quais rotas pertencem ao `public-edge` e quais comandos internos estreitos ele pode emitir?
2. Como Turnstile, rate limit, antiabuso, upload e moderação funcionam em forms/booking/webchat/checkout?
3. Como site publicado é versionado, cacheado, invalidado e restaurado sem acesso ao prontuário?
4. Como consentimento assistencial, marketing e tracking permanecem separados?
5. Qual isolamento de domínio/tenant impede um site customizado de acessar assets ou dados de outro?

## Antes de telemedicina, realtime, IA e dados experimentais

1. Qual provedor de mídia, região, fallback, SLA e adapter passam o spike de telemedicina?
2. Gravação será permitida? Com qual consentimento, chave, acesso e retenção?
3. Quais documentos podem ser colaborativos e qual regra transforma snapshot em versão assinada?
4. Quais providers/modelos de IA podem processar cada classe de dado e sob quais termos?
5. Quais ferramentas cada agente pode chamar, qual limite financeiro/operacional e qual approval gate?
6. Como prompt injection, exfiltração, hallucination, custo e kill switch serão testados?
7. Quais dispositivos/medidas possuem finalidade clínica, consentimento, proveniência e validação suficientes?
8. Qual protocolo experimental e critério de interrupção se aplicam a pose, biomecânica e Digital Twin?

## Antes do primeiro dado real

1. Qual política canônica de `Cache-Control`, CSRF/Origin e cursores assinados será aplicada por tipo de endpoint?
2. Qual superfície privilegiada mínima resolverá identidade/membership sem abrir acesso clínico?
3. Como audit trail será mantido append-only e restaurado/reconciliado junto de Postgres e R2?
4. Quais testes automáticos impedirão bypass dos exports de módulo e de `packages/db`?
5. Qual RPO/RTO, janela de PITR, backup/export off-site e lifecycle/versionamento R2 foram aprovados?
6. O restore drill integrado comprovou dados, objetos, hashes, auditoria e revogação de secrets?
7. Seeds/fixtures foram identificados e removidos ou isolados da produção real?
8. O Go/No-Go confirma RLS por persona, consentimentos, retenção e incident response?

## Reconstrução greenfield

1. Quais regras do dossiê são requisitos confirmados, hipóteses ou artefatos obsoletos?
2. Quais testes de paridade provam as regras selecionadas usando somente fixtures sintéticas?
3. Quais dados de referência legítimos precisam nascer por seed versionado?
4. Como impedir qualquer dump, secret, blob ou registro atual de entrar no repositório/projeto novo?
5. Qual evidência do legado precisa ser preservada como documentação, sem preservar seus dados?

## Decisões já encerradas

- grupos/turmas: não implementar e sem previsão;
- DICOM/PACS: não implementar;
- módulos completos permanecem no roadmap, entregues de forma modular;
- registros atuais: descartar, sem backup ou migração;
- dados reais futuros: somente após PITR/backup e restore testados;
- não copiar a E-Fisio; qualquer uso exige licença ou conteúdo próprio/revisado;
- não criar o novo sistema dentro deste repositório legado sem autorização explícita.
