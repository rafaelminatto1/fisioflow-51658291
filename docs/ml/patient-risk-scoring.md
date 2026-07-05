# ML Leve: Scoring de Risco do Paciente

## Objetivo
Criar uma camada preditiva de **Machine Learning Baseado em Regras (Heurísticas)** para calcular o risco de um paciente abandonar o tratamento, faltar, ou não aderir à conduta fisioterapêutica. 

**Decisão Chave:** O cálculo de risco **NÃO** depende de Large Language Models (LLMs). É estritamente algorítmico. O LLM atua apenas como uma camada de tradução/explicação (Explainable AI) em cima dos resultados numéricos, a pedido do usuário.

## 1. Variáveis e Heurísticas (Features)

A função baseada em regras (`calculatePatientRisks`) absorve as seguintes features estruturadas do banco de dados (Neon Postgres):
- `recentNoShows`: Quantidade de faltas nos últimos 30 dias.
- `recentCancellations`: Quantidade de cancelamentos em cima da hora.
- `sessionsWithoutEvolution`: Quantidade de sessões finalizadas mas sem preenchimento de evolução clínica (sinal de negligência de dados que reduz a aderência percebida).
- `daysSinceLastSession`: Dias ausentes.
- `hasFutureSession`: Flag de engajamento (paciente marcou a próxima?).
- `painVariation`: Variação da dor (escala EVA). Importante: uma melhora drástica (ex: -5) combinada com a falta de agendamento aciona o *Risco de Abandono por Alta Autodeclarada* (paciente achou que melhorou e sumiu).
- `totalSessions`: Quantidade de sessões na jornada.

## 2. Índices Calculados (0 - 100)
1. **No-Show Risk**: Probabilidade de faltar na próxima consulta.
2. **Dropout Risk**: Probabilidade de abandonar a clínica definitivamente.
3. **Non-Adherence Risk**: Probabilidade de não estar engajado (fisioterapeuta ou paciente).
- Flag Booleana `needsActiveContact`: Se o Dropout > 70 ou No-Show > 60, o paciente cai em uma lista de "Reengajamento Ativo" para a secretária ligar.

## 3. Orquestração e Cloudflare
O cálculo do score de todos os pacientes deve rodar uma vez por dia (via **Workers Cron Triggers**) em um Job de Lote. 
As alterações significativas no placar inserem uma linha na tabela `patient_risk_score_events` permitindo análises temporais no Metabase/Looker.

## 4. Explainable AI via AIRouter
Se a recepcionista não entender por que o João tem 85% de risco de falta, ela clica em "Explicar Risco".
Isso faz um `POST /api/ml/patient-risk/:id/explain`.
O backend monta um prompt passando estritamente os números, e aciona o **AIRouter** (`taskType: no_show_risk_explanation`, nível `minimal`). 
O Worker AI responde: *"O João tem 85% de risco porque faltou 3 vezes este mês e não tem nenhuma sessão agendada para a próxima semana."*
Isso garante zero alucinação clínica e baixo custo operacional.
