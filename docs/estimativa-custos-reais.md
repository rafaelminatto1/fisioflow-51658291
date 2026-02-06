# Estimativa de Custos Mensais - FisioFlow
**Baseado no uso atual: 600 evoluções/mês, 10 funcionários, 10 pacientes**

---

## Uso Atual Estimado

| Componente | Uso Mensal Estimado |
|------------|---------------------|
| **Cloud Functions** | 67 funções × ~10k invocações/mês |
| **Firestore** | ~50k leituras, ~20k escritas |
| **Cloud Storage** | ~10 GB armazenamento |
| **Cloud SQL** | 10 GB armazenamento |
| **Vertex AI (Gemini)** | ~600 chamadas (evoluções) |
| **Firebase Auth** | ~20 MAUs |
| **Firebase Hosting** | ~20 GB tráfego |

---

## Custos Mensais Estimados

### Cenário ATUAL (Seu Uso Real)

| Serviço | Quantidade | Preço Unitário | Subtotal USD | Subtotal R$ |
|---------|------------|----------------|-------------|------------|
| **Cloud Functions Gen 2** | | | | |
| - Invocações | ~670.000 | GRÁTIS (até 2M) | R$ 0,00 | |
| - Compute (GB-s) | ~12.000 GB-s | $0.0000165/GB-s | **$0,20** | R$ 1,20 |
| - Solicitações de rede | ~20 GB | GRÁTIS | R$ 0,00 | |
| **Cloud Firestore** | | | | |
| - Armazenamento | 10 GB | $0.18/GB | **$1,80** | R$ 10,80 |
| - Leituras | 50.000 | GRÁTIS (50k/dia) | R$ 0,00 | |
| - Escritas | 20.000 | GRÁTIS (20k/dia) | R$ 0,00 | |
| **Cloud Storage** | | | | |
| - Armazenamento | 10 GB | $0.026/GB | **$0,26** | R$ 1,56 |
| - Download (classe A) | 20 GB | $0.12/GB | **$2,40** | R$ 14,40 |
| **Cloud SQL (PostgreSQL)** | | | | |
| - Armazenamento | 10 GB | $0.10/GB | **$1,00** | R$ 6,00 |
| - Uso de CPU | Baixo | ~$10-20/mês | **$15,00** | R$ 90,00 |
| **Firebase Auth** | | | | |
| - MAUs (usuários ativos) | 20 | GRÁTIS (até 10k) | R$ 0,00 | |
| **Firebase Hosting** | | | | |
| - Tráfego | 20 GB | GRÁTIS (até 10GB) + $0,15/GB excedente | **$1,20** | R$ 7,20 |
| **Secret Manager** | | | | |
| - Secrets ativos | 15 | $0.06/secret | **$0,90** | R$ 5,40 |
| **Vertex AI (Gemini)** | | | | |
| - Evoluções (600) | 600 × $0.01 | **$6,00** | R$ 36,00 |
| **BigQuery (se usado)** | | | | |
| - Armazenamento | Negligenciável | ~$0,50 | **$0,50** | R$ 3,00 |
| | | | | |
| **TOTAL ESTIMADO** | | | **~$29,06** | **~R$ 174,36** |

---

## Custos Adicionais Possíveis

| Serviço | Quando Incorre | Custo Estimado |
|---------|----------------|----------------|
| **Speech-to-Text** | Se transcrever sessões (50/mês) | +$5-10/mês |
| **Translation API** | Se traduzir documentos | +$2-5/mês |
| **Cloud Run minInstances** | Se usar minInstances > 0 | +$15-50/mês por instância |
| **Vertex AI (uso pesado)** | Se aumentar uso de IA | +$20-100/mês |

---

## Estimativa por Faixa de Uso

| Nível de Uso | Custo Mensal USD | Custo Mensal R$ |
|--------------|------------------|-----------------|
| **Mínimo** (atual) | $25-30 | R$ 150-180 |
| **Médio** (2x uso) | $50-70 | R$ 300-420 |
| **Alto** (5x uso) | $120-180 | R$ 720-1.080 |
| **Intensivo** (10x uso) | $250-400 | R$ 1.500-2.400 |

---

## Como Verificar Custos Reais

### Via Console Google Cloud
```bash
# Abra oBilling Console
gcloud billing accounts list

# Ou acesse diretamente:
https://console.cloud.google.com/billing
```

### Via CLI (últimos 30 dias)
```bash
gcloud billing projects describe fisioflow-migration
```

### Configurar Alerta de Custo
1. Acesse: https://console.cloud.google.com/billing
2. Selecione a conta "Minha conta de faturamento"
3. Menu "Orçamento e alertas"
4. Crie um orçamento mensal (ex: R$ 500,00)

---

## Recomendações para Reduzir Custos

### 1. ✅ Já Implementado
- Lazy loading de funções
- Cache de queries frequentes
- maxInstances: 1 (controla escala)

### 2. Melhorias Possíveis
- **Compactar dados no Firestore** (-30% armazenamento)
- **Usar Gemini Flash ao invés de Pro** (-75% custos de IA)
- **Implementar cache de IA** (-50% chamadas repetidas)
- **Otimizar imagens do Storage** (-40% armazenamento)

### 3. Otimizações Futuras
- Consolidar funções (67 → ~30 funções)
- Usar Cloud Run com escalonamento inteligente
- Implementar cache no Redis (em vez de queries repetidas)

---

## Resumo Executivo

**Estimativa mensal para seu cenário atual:**
> **R$ 150 a R$ 200 por mês** (~$25-30 USD)

**Principais componentes de custo:**
1. Cloud SQL: ~R$ 90-100
2. Vertex AI (IA): ~R$ 35-40
3. Storage + Firestore: ~R$ 25-30
4. Hosting + Functions: ~R$ 10-15

**Projeção para crescimento:**
- Com 20 funcionários e 50 pacientes: ~R$ 300-400/mês
- Com 50 funcionários e 200 pacientes: ~R$ 700-900/mês

**Observação:** Os custos podem variar conforme o uso real. Recomendo configurar um alerta de orçamento de R$ 500/mês para evitar surpresas.
