# Observabilidade, Custos e Alertas (AI Health)

## 1. Visão Geral
Uma infraestrutura robusta precisa de observabilidade em tempo real, especialmente quando usamos Inteligência Artificial por demanda (Pay-as-you-go). O objetivo desta camada é evitar "billing shocks" (sustos na fatura) e detectar indisponibilidades de modelos ou quebras de Jobs.

## 2. Métricas Coletadas e Arquitetura

### 2.1 Custo de IA
A tabela `ai_usage_events` centraliza as transações de IA geradas pelo `AIRouter`. Ela guarda:
- `estimatedCostUsd` e `estimatedCostBrl`.
- `model`, `provider`, `taskType` e `userId`.
O endpoint **`GET /api/admin/observability/ai-cost`** (Drizzle) consolida os custos para mostrar de onde vem o maior gasto. (Ex: Descobrir que o sumário longitudinal custa 80% da fatura, sugerindo a troca para um modelo mais barato).

### 2.2 AI Gateway Analytics
A Cloudflare fornece o painel do AI Gateway nativo, mas puxamos métricas chaves pro nosso painel interno via Log:
- **Cache Hits**: Chamadas economizadas pelo cache (custo zero).
- **Blocked By Budget**: Bloqueios (Hard limits) implementados no `AIRouter` acionados quando o alerta de 100% estoura.

### 2.3 Saúde de Workflows/Queues
A tabela `background_jobs_log` ou `analytics_engine_datasets` monitora a eficiência do processamento em lote. O endpoint **`GET /api/admin/observability/jobs`** calcula a **Taxa de Sucesso (Success Rate)**. Se cair para < 95%, sinaliza falha estrutural.

## 3. Alertas Configurados
No sistema base, engatilhamos via **Sentry** (ou envio de Webhook para Discord/Slack do Admin) os seguintes alertas de segurança financeira:
1. **Alerta Amarelo (50% do Orçamento)**: Dispara notificação simples. (Ex: "R$ 250 atingidos na metade do mês").
2. **Alerta Laranja (80% do Orçamento)**: Limite de atenção.
3. **Alerta Vermelho (100% do Orçamento)**: O `AIRouter` entra em modo *Fallback*. Tarefas não-críticas (ex: Geração de Emojis) falham silenciosamente para poupar requisições, preservando o budget restrito APENAS para Evoluções Clínicas (SOAP).
4. **Error Spike (Aumento Anormal de Erros)**: Se a taxa de erro de Queue ultrapassar 5% no dia, os administradores recebem um log (`/api/admin/observability/errors`).

## 4. Frontend Admin
O componente `ObservabilityDashboard.tsx` no `apps/web` materializa a interface dessas informações em gráficos visuais para gestão hospitalar. 

---
**Importante (LGPD)**: Este dashboard exibe estatísticas puramente financeiras e operacionais (UUIDs e quantias). Os `prompts` não são expostos nesta tela.
