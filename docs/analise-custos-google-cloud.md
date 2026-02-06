# Análise de Custos - FisioFlow no Google Cloud Platform

## Cenário Base
- **600 evoluções/mês**
- **10 funcionários** (fisioterapeutas, admin)
- **10 pacientes** com acesso ao app do paciente
- **Região:** southamerica-east1 (São Paulo)

---

## Cenário 1: Uso Mínimo (Plano Blaze - Pay As You Go)

### Uso Estimado
- **Evoluções:** 600/mês
- **Login de funcionários:** ~200/mês (10 funcionários × 20 dias úteis)
- **Login de pacientes:** ~100/mês (10 pacientes × 10 acessos/mês)
- **Consultas de agendamento:** ~1.000/mês
- **Storage:** 5 GB (fotos, documentos)
- **Downloads do app:** ~50/mês

### Custos Mensais Estimados

| Serviço | Uso | Custo (USD) | Custo (R$)* |
|----------|-----|-------------|-------------|
| **Firebase Auth** | 300 MAUs | **GRÁTIS** | R$ 0,00 |
| **Cloud Firestore** | 50k lê, 20k esc, 5GB armazenamento | **GRÁTIS** | R$ 0,00 |
| **Firebase Hosting** | 10 GB download | **GRÁTIS** | R$ 0,00 |
| **Cloud Functions** | 200k invocações, 400 GB-s | **GRÁTIS** | R$ 0,00 |
| **Cloud Storage** | 5 GB | **GRÁTIS** | R$ 0,00 |
| **Vertex AI (Gemini)** | 600 chamadas (IA clínica) | $6,00 | R$ 36,00 |
| **Cloud SQL** | 10 GB storage, packing | $0,50 | R$ 3,00 |
| **Secret Manager** | 10 secrets | $0,60 | R$ 3,60 |
| **TOTAL** | | **~$7,10** | **~R$ 42,60** |

*\* Taxa de câmbio estimada: R$ 6,00/USD*

---

## Cenário 2: Uso Médio (Crescimento Moderado)

### Uso Estimado
- **Evoluções:** 600/mês + 100 exames analisados por IA
- **Login de funcionários:** ~300/mês
- **Login de pacientes:** ~300/mês (uso crescente)
- **Consultas de agendamento:** ~3.000/mês
- **Transcrição de áudio:** 50 sessões (15 minutos cada)
- **Tradução:** 200 documentos
- **Storage:** 20 GB
- **Downloads do app:** ~200/mês

### Custos Mensais Estimados

| Serviço | Uso | Custo (USD) | Custo (R$)* |
|----------|-----|-------------|-------------|
| **Firebase Auth** | 600 MAUs | **GRÁTIS** (até 10k) | R$ 0,00 |
| **Cloud Firestore** | 200k lê, 50k esc, 20GB | $2,50 | R$ 15,00 |
| **Firebase Hosting** | 50 GB download | **GRÁTIS** (até 10GB) + $0,15 | R$ 0,90 |
| **Cloud Functions** | 500k invocações, 2.000 GB-s | $2,00 | R$ 12,00 |
| **Cloud Storage** | 20 GB + 100 GB download | $0,30 + $0,20 | R$ 3,00 |
| **Vertex AI (Gemini)** | 700 chamadas | $7,00 | R$ 42,00 |
| **Speech-to-Text** | 12,5 horas | $1,00 | R$ 6,00 |
| **Translation API** | 200k caracteres | $0,40 | R$ 2,40 |
| **Cloud SQL** | 20 GB storage, 1 vCPU | $15,00 | R$ 90,00 |
| **Secret Manager** | 10 secrets | $0,60 | R$ 3,60 |
| **TOTAL** | | **~$29,10** | **~R$ 174,60** |

---

## Cenário 3: Uso Extremo (Alta Escala)

### Uso Estimado
- **Evoluções:** 1.000/mês
- **Pacientes ativos:** 100
- **Login de funcionários:** ~500/mês
- **Login de pacientes:** ~2.000/mês
- **Consultas de agendamento:** ~20.000/mês
- **Transcrição de áudio:** 300 sessões
- **Análise de movimento:** 100 vídeos
- **Tradução:** 1.000 documentos
- **Storage:** 100 GB
- **Downloads do app:** ~1.000/mês
- **Cloud Run:** 5 instâncias mínimas

### Custos Mensais Estimados

| Serviço | Uso | Custo (USD) | Custo (R$)* |
|----------|-----|-------------|-------------|
| **Firebase Auth** | 3.000 MAUs | **GRÁTIS** (até 10k) | R$ 0,00 |
| **Cloud Firestore** | 2M lê, 500k esc, 100GB | $45,00 | R$ 270,00 |
| **Firebase Hosting** | 500 GB download | $0,85 | R$ 5,10 |
| **Cloud Functions** | 5M invocações, 50k GB-s | $75,00 | R$ 450,00 |
| **Cloud Storage** | 100 GB + 1 TB download | $2,00 + $0,87 | R$ 17,22 |
| **Vertex AI (Gemini)** | 2.000 chamadas | $20,00 | R$ 120,00 |
| **Speech-to-Text** | 75 horas | $6,00 | R$ 36,00 |
| **Translation API** | 1M caracteres | $2,00 | R$ 12,00 |
| **Video Intelligence** | 100 vídeos (5min cada) | $15,00 | R$ 90,00 |
| **Cloud SQL** | 100 GB, 2 vCPUs | $90,00 | R$ 540,00 |
| **Secret Manager** | 20 secrets | $1,20 | R$ 7,20 |
| **Cloud Run** | 5 min instâncias (CPU) | $45,00 | R$ 270,00 |
| **TOTAL** | | **~$302,72** | **~R$ 1.816,32** |

---

## Custos de IA do Google (Vertex AI / Gemini)

### Preços por Modelo (southamerica-east1)

| Modelo | Entrada | Saída | Uso Típico |
|--------|---------|-------|------------|
| **Gemini 1.5 Flash** | $0.075/M tokens | $0.30/M tokens | Chat rápido, sugestões |
| **Gemini 1.5 Pro** | $1.25/M tokens | $5.00/M tokens | Análise clínica completa |
| **Gemini 2.5 Pro** | $1.25/M tokens | $10.00/M tokens | Geração de SOAP complexo |

### Exemplos de Custos por Operação

| Operação | Tokens | Modelo | Custo |
|----------|--------|--------|-------|
| Análise de evolução | ~2.000 in/out | Flash 1.5 | $0,0008 (~R$ 0,005) |
| Geração de SOAP completo | ~10.000 in/out | Pro 1.5 | $0,06 (~R$ 0,36) |
| Análise de movimento | ~5.000 in/out | Pro 2.5 | $0,06 (~R$ 0,36) |

### Estimativa Mensal por Cenário

| Cenário | Evoluções com IA | Custo Mensal IA |
|---------|------------------|-----------------|
| **Mínimo** | 600 (análises simples) | $6,00 (R$ 36,00) |
| **Médio** | 700 simples + 100 complexas | $15,00 (R$ 90,00) |
| **Extremo** | 1.000 simples + 500 complexas | $50,00 (R$ 300,00) |

---

## Recomendações para Otimização de Custos

### 1. **Usar Plano Blaze com atenção aos limites gratuitos**
- Firestore: 50k leituras/dia grátis
- Functions: 125k invocações/dia grátis
- Cloud Storage: 5 GB grátis

### 2. **Cache de respostas de IA**
- Cachear evoluções similares pode reduzir chamadas à API em 30-40%

### 3. **Usar Gemini Flash para operações simples**
- 90% mais barato que Pro
- Adequado para sugestões rápidas

### 4. **MinInstances com cautela**
- MinInstances mantém funções "quentes" mas custa mesmo sem uso
- Recomendado apenas para funções críticas

### 5. **Compactar dados no Firestore**
- Reduzir tamanho dos documentos economiza leitura/escrita

### 6. **Usar Cloud Run para funções pesadas**
- Mais controle sobre recursos
- Pode ser mais econômico que Functions para uso intenso

---

## Upgrade Necessário: Plano Spark

Para operação em escala, considerar **Firebase Blaze (Pay as You Go)** + possivelmente upgrade para plano pago em alguns serviços:

- **Plano Spark (grátis)** limita CPU total por região
- **Quota atual:** ~2-4 vCPUs por região
- **Para escalar:** necessário remover limites do plano Spark

### Quando fazer upgrade?

| Indicador | Ação |
|-----------|------|
| > 50k requisições/dia | Considerar upgrade Functions |
| > 10 MAUs | Plano Blaze ainda OK |
| > 100 GB Firestore | Avaliar plano pago |
| Erros de "Quota exceeded" | **IMEDIATO** - upgrade necessário |

---

## Resumo Executivo

| Cenário | Custo Mensal USD | Custo Mensal R$ | Viable no Plano Gratuito? |
|---------|------------------|-----------------|--------------------------|
| **Mínimo** | $7,10 | R$ 42,60 | ✅ Sim (com limites) |
| **Médio** | $29,10 | R$ 174,60 | ⚠️ Parcial - precisa Blaze |
| **Extremo** | $302,72 | R$ 1.816,32 | ❌ Não - requer plano pago |

**Conclusão:** Para o cenário atual (600 evoluções, 10 funcionários, 10 pacientes), o **plano gratuito Blaze** é suficiente, mas atenção aos limites de CPU que já estão sendo atingidos.
