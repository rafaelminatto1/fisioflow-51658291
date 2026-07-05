# AI Router - Camada Centralizada de Inteligência Artificial

## Visão Geral
O `AIRouter` é um componente **obrigatório** para qualquer chamada de IA (LLM, Embeddings) dentro do repositório FisioFlow. Ele garante que as chamadas respeitem orçamentos, enviem as métricas corretas para auditoria, e usem os fallbacks apropriados em caso de falha, além de passar pelo Cloudflare AI Gateway.

## Restrições e Regras
- **NENHUMA** requisição direta a APIs como `OpenAI`, `Google AI Studio` ou `Workers AI` deve ser feita fora desta lib.
- O modelo **GLM 5.2** é terminantemente proibido em produção.
- Limites de orçamento diário (`AI_DAILY_BUDGET_BRL`) e mensal (`AI_MONTHLY_BUDGET_BRL`) são respeitados e bloqueiam a requisição quando excedidos.

## Modos de Operação (Task Types)
Cada chamada precisa declarar o `taskType` exato. Isso é usado para alocação de tokens e analytics:
- `soap_draft`
- `patient_message`
- `clinical_summary`
- `clinical_reasoning`
- `admin_report`
- `rag_answer`
- `exercise_suggestion`
- `reengagement_message`
- `discharge_summary`
- `no_show_risk_explanation`

## Fallbacks e Recuperação de Erro
Caso o `provider` principal falhe, o sistema engatilhará uma rechamada usando o modelo de fallback configurado (geralmente um modelo rápido e barato, ex: `@cf/meta/llama-3-8b-instruct`), e marcará a falha originária com a mensagem apropriada na tabela `ai_usage_events`.

## Tabelas Envolvidas
- `ai_usage_events`: Grava todo o log transacional de requisições de IA para auditoria e controle de orçamento.
