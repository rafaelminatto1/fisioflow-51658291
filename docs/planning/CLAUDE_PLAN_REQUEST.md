# Pedido para Claude Code: Análise e Planejamento Técnico

Este documento solicita ao Claude Code (modelo) que analise o histórico do chat e gere um plano técnico detalhado para os próximos passos do projeto FisioFlow, com foco em entrega técnica e governança, sem alterações de código neste momento.

Contexto do projeto (recorte)
- Repositório monorepo FisioFlow com stack API/Backend (Cloudflare Workers/Hono, Neon Postgres, Drizzle ORM, Neon Auth), Web (React), Professional e Patient Apps (React Native/Expo), design system e documentação local.
- Branch atual: main; últimas mudanças enfocam migrações, testes, observabilidade, segurança, design system e backlog (documentos criados: MIGRACOES.md, TESTS.md, OBSERVABILITY.md, SECURITY.md, DESIGN_SYSTEM.md, BACKLOG.md).
- Objetivo atual: transformar o backlog em um plano de entrega técnico com milestones, owners, estimativas, dependências, riscos e critérios de sucesso.

Escopo solicitado
- Analisar o chat acima e produzir um plano técnico detalhado com as seguintes seções: visão geral, premissas, metas, road map em fases, entregáveis por fase, cronograma, estimativas de esforço, dependências, riscos, KPIs/criterios de sucesso, e runbooks de governança.
- Entregar em formato Markdown para facilitar importação/reuso em seu repositório. Incluir as referências aos artefatos já criados (MIGRACOES.md, TESTS.md, OBSERVABILITY.md, SECURITY.md, DESIGN_SYSTEM.md, BACKLOG.md).

Estrutura sugerida do plano (proposta de Claude Code)
- 1) Visão Geral do Plano
- 2) Premissas e Limites
- 3) Objetivos e Métodos de Sucesso (KPI)
- 4) Escopo Detalhado
- 5) Roadmap por Fase (Fase 1-6)
- 6) Entregáveis por Fase (com owners, artefatos esperados, critérios de aceitação)
- 7) Cronograma (sprints/milestones) e dependências
- 8) Riscos e Mitigações
- 9) Governança (Quem faz o quê, ciclo de revisões)
- 10) Anexos (links para MIGRACOES.md, TESTS.md, etc.)
- 11) Critérios de Saída (quando o plano é considerado concluído)

Notas técnicas
- O tom deve ser técnico, objetivo, com termos de entrega e métricas mensuráveis. Evite jargão não técnico e foque em ações acionáveis com responsáveis e prazos.
- Caso Claude precise de dados adicionais, incluir uma seção de Perguntas/Decisões Pendentes no final do plano.

Instruções para Claude Code
- Use as seções acima para estruturar o documento; traga um plano de implementação com milestones, owners, estimativas, dependências, riscos e critérios de sucesso. Inclua uma visão de alto nível de arquitetura para balizar decisões.
- Ao término, apresente também um sumário executivo com as principais decisões, e, se possível, links para os artefatos existentes e propostas de melhoria.

Anexo
- Este arquivo descreve como solicitar ao Claude Code um planejamento técnico coeso com alinhamento ao backlog já gerado. Não inclui mudanças de código por ora, apenas planejamento formal.
