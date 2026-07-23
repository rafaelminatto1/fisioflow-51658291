# 15 — Opções de Arquitetura Futura (TO-BE)

> ⚠️ Esta seção é **recomendação**, não estado atual. Congelada a documentação AS-IS (00–14), avaliamos alternativas. Nenhuma troca é recomendada por novidade; só com justificativa técnica, de LGPD/latência e de custo.

## Baseline: Cloudflare + Neon (opção recomendada — manter)

A stack atual é **adequada** e já dominada. Recomenda-se **mantê-la** e investir em higiene, não em migração de fornecedor.

**Prós**: latência sa-east-1 boa p/ Brasil; escala sem ops; ecossistema já em uso (Workers, DOs, Queues, Workflows, Workers AI, Vectorize, AI Search, Stream, R2, Hyperdrive); Neon com branching/PITR; equipe experiente.
**Contras**: lock-in em Workers AI/Stream/DOs/AI Search; Workflows com deploy flaky; RLS + Hyperdrive exige role não-owner (hoje mal configurado); DOs e Workflows são difíceis de testar localmente.
**Gatilhos para reconsiderar**: custo de Workers AI/Stream escalar além do previsto; necessidade de transações longas/complexas que Workers dificultam; equipe crescer e precisar de ferramental de teste local mais rico.

## Alternativa A — Supabase (Postgres + Auth + Storage + Realtime gerenciados)

**Prós**: Postgres real com **RLS de primeira classe** (resolve a dívida estrutural nº1), Auth integrado (unifica os 3 trilhos), Storage S3-compatível, Realtime, Edge Functions; região sa-east-1 disponível; forte DX e testes locais (supabase CLI).
**Contras**: sair de Cloudflare significa reescrever Workers/DOs/Workflows/Queues/Workers AI; Realtime do Supabase é menos flexível que DOs para colaboração Yjs; lock-in migra de CF para Supabase; custo previsível mas pode superar CF no volume atual baixo.
**Onde faz sentido**: se a prioridade for RLS correto + auth unificado + DX, e o time aceitar reescrever a camada assíncrona.

## Alternativa B — Stack "clássico" (container Node/Hono em Fly.io ou Render + Postgres gerenciado + Redis/BullMQ)

**Prós**: portabilidade máxima (sem lock-in de plataforma serverless); transações longas triviais; testes locais 100% fiéis (docker-compose); jobs/filas com BullMQ maduro; Postgres com RLS real.
**Contras**: volta a gerir infraestrutura (escala, deploy, observabilidade); perde Workers AI/Vectorize/AI Search/Stream (precisa de OpenAI/pgvector/Mux/etc.); colaboração realtime precisa de solução própria (Hocuspocus para Yjs).
**Onde faz sentido**: se lock-in for a maior preocupação e o time quiser controle total.

## Matriz de decisão (resumo)

| Critério | CF+Neon (baseline) | Supabase | Clássico (Fly/Render) |
|---|---|---|---|
| RLS/multi-tenancy | Possível mas hoje mal-feito | **Excelente** | Excelente |
| LGPD/região BR | sa-east-1 ✅ | sa-east-1 ✅ | escolher região ✅ |
| Transações/consistência | Boa (limitada em Workers) | **Excelente** | **Excelente** |
| Realtime (Yjs colab) | **Excelente** (DOs) | Bom | Próprio (Hocuspocus) |
| Jobs/Workflows/Filas | **Excelente** (nativo) | Bom (Edge Fn + cron) | **Excelente** (BullMQ) |
| Storage/mídia | R2+Stream ✅ | Storage ✅ (sem Stream) | S3+Mux |
| Busca/vetores | Vectorize+AI Search | pgvector | pgvector |
| Observabilidade | Nativa+Axiom | Boa | Montar |
| Custo (volume atual) | **Baixo** | Baixo-médio | Médio (compute idle) |
| Complexidade ops | **Baixa** | Baixa | Média-alta |
| Testabilidade local | Fraca (DOs/WF) | **Boa** | **Excelente** |
| Lock-in | Alto | Médio | **Baixo** |
| Experiência do time | **Alta** | Média | Média |
| Esforço de migração a partir do atual | **Mínimo** | Alto | Alto |

## Arquitetura híbrida (a considerar)

Nada obriga fornecedor único. Combinação plausível: **Neon Postgres (RLS real, role de runtime)** + **Cloudflare Workers/DOs/Queues/R2/Stream** (mantém o que é forte) + **auth unificado** (Neon Auth ou Better Auth self-host) + **observabilidade Axiom/Sentry**. Isso preserva os pontos fortes atuais e corrige a dívida sem reescrever tudo.

## Recomendação final

**Manter Cloudflare + Neon**, tratando a reconstrução como oportunidade de **corrigir a dívida** (RLS real com role não-owner; schema único; auth unificado; deny-by-default; migrations com ledger; limpeza de órfãos), **não** de trocar de plataforma. Reavaliar Supabase apenas se, após decisão do time, RLS/auth/testabilidade pesarem mais que o custo de reescrever a camada assíncrona. Documentar a decisão em ADR antes de iniciar.

## Premissas e riscos

- Premissa: volume permanece baixo-médio no curto prazo (1–poucas clínicas).
- Risco: manter CF perpetua a dificuldade de teste local de DOs/Workflows — mitigar com camada de abstração testável.
- Risco: custo de Workers AI/Stream se o uso de IA/vídeo crescer — monitorar via AI Gateway spend limits (já existe).
