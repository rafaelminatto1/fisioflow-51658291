# 📅 Plano de Implementação: FisioFlow + Google Cloud AI & Healthcare

Este documento detalha o roteiro de execução para transformar a arquitetura do FisioFlow conforme os insights gerados.

**Objetivo:** Implementar a infraestrutura base para IA (Genkit), Dados Médicos (Healthcare API) e Processamento Pesado (Cloud Run).

---

## 🛠️ FASE 1: Preparação da Infraestrutura (Imediato)
*Foco: Habilitar serviços e configurar dependências.*

- [ ] **1.1. Script de Setup GCP:** Criar script `setup_gcp_services.sh` para habilitar APIs necessárias (Vertex AI, Healthcare API, Cloud Run, Artifact Registry).
- [ ] **1.2. Atualização de Dependências:** Instalar pacotes do Firebase Genkit e Google Cloud no diretório `functions/`.
- [ ] **1.3. Configuração TypeScript:** Ajustar `tsconfig.json` para suportar a nova arquitetura modular.

## 🧠 FASE 2: Implementação do "AI Coach" (Genkit)
*Foco: Lógica de geração de treinos com IA estruturada.*

- [ ] **2.1. Configuração Genkit:** Criar `functions/src/ai/config.ts`.
- [ ] **2.2. Schema Zod:** Definir a estrutura rígida de dados para Planos de Exercícios.
- [ ] **2.3. AI Flow:** Implementar o fluxo `generateExercisePlan` que recebe parâmetros do paciente e retorna JSON validado.
- [ ] **2.4. Cloud Function Trigger:** Expor o fluxo como uma HTTPS Callable Function (2nd Gen).

## 🏥 FASE 3: Camada de Dados Médicos (Healthcare API)
*Foco: Estrutura para lidar com DICOM e interoperabilidade.*

- [ ] **3.1. Adaptador Healthcare:** Criar `functions/src/healthcare/adapter.ts` para interagir com a API de DICOM.
- [ ] **3.2. Função de Token:** Criar utilitário para gerar tokens de acesso limitados para visualizadores de imagem (frontend).

## ⚡ FASE 4: Processamento Pesado (Cloud Run)
*Foco: Containerização para processamento futuro (Python).*

- [ ] **4.1. Worker Skeleton:** Criar diretório `workers/image-processor`.
- [ ] **4.2. Dockerfile:** Criar configuração de container otimizada para Python (com suporte futuro a OpenCV/Pydicom).
- [ ] **4.3. API Worker:** Implementar um servidor leve (FastAPI) para receber tarefas.

---

## 🚀 Como Executar

O agente irá executar as tarefas na ordem sequencial acima.
