# Plano Cloudflare FisioFlow

## Premissas operacionais

- Neon Postgres e Neon Auth continuam como fonte primaria de dados clinicos, identidade e RLS.
- Cloudflare entra como camada edge, IA, busca, automacao duravel, observabilidade e armazenamento de midia.
- Audio clinico nunca deve ser captado como ambiente permanente por padrao. Cada captura precisa de consentimento, secao SOAP, motivo clinico e cobertura planejada: 0%, 30%, 50% ou 100%.
- Recursos beta podem ser usados, mas devem ficar isolados por binding/feature flag e com fallback quando a conta ainda nao tiver acesso.

## Fases

1. Fundacao AI Search
   - Reativar binding `AI_SEARCH`.
   - Migrar chamadas para `ai_search_options.retrieval`.
   - Manter fallback para mocks/formatos antigos enquanto a base e os testes migram.
   - Indexar wiki, protocolos e exercicios com metadata clinica.

2. Governanca de audio e transcricao
   - Adicionar metadados de captura no Neon.
   - Expor modos 0/30/50/100 no frontend.
   - Persistir motivo, cobertura e duracao capturada.
   - Usar transcricao apenas em avaliacoes, testes, medicoes ou trechos deliberados da sessao.

3. Agent Memory beta
   - Criar namespace `fisioflow-memory`.
   - Registrar apenas memorias operacionais e preferencias clinicas resumidas.
   - Evitar gravar transcricoes brutas e PHI desnecessaria.
   - Usar wrapper opcional para nao quebrar deploy se o beta ainda nao estiver liberado.

4. Agents e Workflows
   - Usar ClinicAgent para briefing, pendencias, risco operacional e resumo diario.
   - Usar PatientAgent para contexto longitudinal e recomendacoes supervisionadas.
   - Usar Workflows para sincronizar conhecimento, reengajamento, alta, reminders e resumo de sessoes.

5. Analytics Cloudflare
   - Consultar GraphQL Analytics API para Workers, Workflows e saude operacional.
   - Manter Analytics Engine para eventos internos por organizacao.
   - Criar endpoints admin com custo/uso de IA e sinais de degradacao.

6. SDKs e operacao
   - Usar Cloudflare TypeScript SDK apenas em scripts/admin server-side.
   - Nao expor tokens Cloudflare ao frontend.
   - Manter `wrangler` para deploy e automacao de bindings.

## Custos esperados

Com Workers Paid ja ativo, o uso descrito da clinica tende a ficar baixo:

- 10 profissionais, 700 agendamentos/mes e 100 pacientes com app: volume pequeno para Workers, KV, D1, Queues e Workflows.
- AI Search em beta/open beta: sem custo direto dentro dos limites atuais; Workers AI ou AI Gateway usados por ele podem cobrar conforme uso.
- Agent Memory beta: sem billing atual, com aviso previo antes de cobrar.
- Transcricao: principal custo variavel. Com captura deliberada em 0/30/50/100%, o custo fica proporcional aos minutos realmente gravados.
- R2/Stream: usar para midia clinica quando necessario; manter retencao e expurgo para nao acumular armazenamento inutil.

## Ordem de deploy

1. Aplicar migracao Neon dos metadados do scribe.
2. Criar/confirmar AI Search instance `fisioflow-rag`.
3. Criar/confirmar Agent Memory namespace `fisioflow-memory`.
4. Deploy do Worker API.
5. Rodar sync da wiki/protocolos/exercicios.
6. Validar busca, scribe com 0/30/50/100 e endpoints admin de analytics.
