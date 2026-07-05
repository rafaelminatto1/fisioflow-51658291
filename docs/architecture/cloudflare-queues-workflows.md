# Cloudflare Queues vs Workflows no FisioFlow

## 1. Visão Geral
Temos dois motores principais de processamento assíncrono (Background Jobs) fornecidos pela Cloudflare: **Queues** e **Workflows**. Usar a ferramenta certa para o trabalho certo é vital para não encarecer a fatura, evitar deadlocks e garantir a idempotência.

### Queues (Filas de Mensagens)
- **Quando usar:** Tarefas rápidas (< 30 segundos), disparos únicos, alta vazão, puramente idempotentes (onde processar duas vezes seguidas por engano não quebra nada crítico) e que não precisam de estado (stateless).
- **Exemplos no FisioFlow:**
  - Gerar embeddings após salvar uma Evolução.
  - Atualizar o resumo longitudinal do paciente no banco.
  - Recalcular o escore de Risco de Falta/Abandono.
  - Processamento de faturamento (batch simples).
- **Infraestrutura:** `fisioflow-background-tasks` e `fisioflow-whatsapp-inbound`.
- **Configuração:** Lotadas de Retries curtos e encaminhamento para DLQ (Dead Letter Queue) após falhas excessivas.

### Workflows (Orquestração de Processos)
- **Quando usar:** Processos longos, que exigem estado (stateful), esperas programadas (sleep), múltiplos passos (steps), retries manuais de partes específicas ou falhas complexas.
- **Exemplos no FisioFlow:**
  - **Reengajamento de Pacientes** (`patient-reengagement`): Espera 3 dias, verifica se marcou, envia mensagem.
  - **Lembrete de Consulta** (`appointment-reminder`): Dorme até faltarem 24h para a sessão, então envia WhatsApp.
  - **Emissão de NFS-e** (`nfse-emission`): Fluxo de emissão tributária que pode ter dependências e retries com a Prefeitura.
  - **Alta Programada** (`patient-discharge`): Reúne relatórios, aguarda revisão do fisioterapeuta responsável, dispara pesquisa de NPS (Net Promoter Score) e inativa a ficha.

## 2. Padrão de Payload Estrito
Para uniformizar o rastreamento, **TODA** mensagem de Queue ou payload de Workflow deve respeitar a interface `BackgroundJobPayload` (localizada em `apps/api/src/lib/background/payloadTypes.ts`):

```typescript
export interface BackgroundJobPayload {
  jobId: string;           // UUID único (obrigatório para Idempotência)
  organizationId: string;
  patientId?: string;
  sessionId?: string;
  taskType: TaskType;      // Ex: "generate_embedding"
  createdBy: string;       // userId ou "system" (Cron)
  createdAt: string;       // ISO 8601
  metadata?: Record<string, any>;
}
```

## 3. Idempotência e Logs de Auditoria
A idempotência é garantida checando o `jobId` no banco antes do processamento (`checkIdempotency`).
O ciclo de vida do job (Queue ou Workflow) deve chamar `logJobStart` no início da rotina e `logJobFinish` (com "completed" ou "failed") ao terminar, em bloco `try/catch/finally`. Isso garante observabilidade via painéis de métricas sem travar a interface da recepcionista ou do clínico.

## 4. Agendadores (Cron Triggers)
Workflows sistêmicos (ex: Sincronização de Wiki) rodam via **Cron Triggers** definidos no `wrangler.toml` (ex: `0 9 * * *`). 
As automações que varrem o banco Neon em busca de pacientes "esquecidos" devem ser chamadas por Cron, empacotando os IDs em um array e repassando para o Queue de background para não estourar o limite de CPU/Memória do Worker que engatilhou o Cron.
