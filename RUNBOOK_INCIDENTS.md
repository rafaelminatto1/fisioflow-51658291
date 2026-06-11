# Runbook de Incidentes — FisioFlow

> Procedimentos operacionais para detecção, resposta e recuperação de falhas críticas.

## 1. Canais de Alerta e Contatos

- **Responsável Técnico:** Rafael Minatto
- **Canal de Alertas:** [DEFINIR: ex: Grupo WhatsApp "FisioFlow Alerts" / Canal Slack #alerts]
- **Monitoramento:** Cloudflare Workers Observability + Neon Console

## 2. Níveis de Severidade

| Nível            | Impacto                                                           | Resposta Esperada              |
| ---------------- | ----------------------------------------------------------------- | ------------------------------ |
| **P0 (Crítico)** | Sistema indisponível (5xx em massa), erro de login global.        | Resposta imediata (24/7).      |
| **P1 (Alto)**    | Feature principal quebrada (Agenda, Observação Livre), latência p95 > 2s.     | Resposta em até 4h comerciais. |
| **P2 (Médio)**   | Feature secundária com bug (Gamification, NPS), UI inconsistente. | Resposta em até 48h.           |

## 3. Procedimentos de Recuperação

### Falha na API (Cloudflare Worker)

1. **Verificar logs:** `wrangler tail --env production`
2. **Rollback imediato:** `wrangler rollback` (retorna para a última versão estável).
3. **Check de Saúde:** `curl https://api-pro.moocafisio.com.br/api/health/ready`

### Falha no Banco de Dados (Neon)

1. **Status:** Verificar `https://status.neon.tech/`.
2. **PITR (Point-in-Time Recovery):** Restaurar o banco para o estado de X minutos atrás via console Neon (disponível por 7 dias).
3. **Conexão:** Verificar se o `HYPERDRIVE_ID` no `wrangler.toml` está correto.

### Falha de Mensageria (WhatsApp/Push)

1. **Queue:** Verificar fila de DLQ (Dead Letter Queue) no Cloudflare dashboard.
2. **Credenciais:** Validar `WHATSAPP_ACCESS_TOKEN` no Meta Business Suite.

## 4. Recuperação de Desastre Regional (DR)

Caso a região **São Paulo (sa-east-1)** sofra uma queda total:

### 1. Banco de Dados (Reserva Geográfica)

- O Neon DB mantém snapshots diários via `scripts/neon-backup.ts`.
- **Ação:** Identificar o ID da branch de backup mais recente (`backup-YYYY-MM-DD-HHmm`).
- **Comando:** No console Neon, promova esta branch para `main` ou aponte a connection string do Worker para o endpoint desta branch.

### 2. Mídia e Arquivos (R2 DR)

- Os arquivos estão replicados no bucket `fisioflow-media-dr`.
- **Ação:** No `wrangler.toml`, altere o binding `MEDIA_BUCKET` para apontar para `fisioflow-media-dr`.

### 3. Redirecionamento de Tráfego

- O Cloudflare redirecionará automaticamente para o nó mais próximo disponível.
- Se o Worker principal em SP falhar, o deploy em outras regiões (edge) assumirá a carga conectando-se ao banco de backup.

## 5. Rotação de Segredos

- Em caso de vazamento de `.env` ou `.dev.vars`, rodar script de rotação e atualizar `wrangler secret put` imediatamente.

## 5. Comunicação com Clientes

- Template: "Estamos cientes de uma instabilidade no sistema [Feature] e nossa equipe técnica já está trabalhando na resolução. Previsão de retorno: [X] min."
