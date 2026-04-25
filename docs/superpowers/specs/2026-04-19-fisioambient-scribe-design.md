# Spec Técnica: FisioAmbient (AI Scribe) v1.0

## 1. Visão Geral

O **FisioAmbient** é um assistente de documentação clínica por voz que automatiza a criação de notas SOAP, reduzindo o tempo administrativo dos fisioterapeutas através de inteligência artificial na borda (Edge AI).

## 2. Experiência do Usuário (UI/UX)

- **Scribe Drawer:** Painel lateral persistente acessível em todas as telas de prontuário do paciente.
- **Workflow de Consentimento:** Antes do primeiro acionamento de voz na sessão, o terapeuta deve confirmar o "Consentimento Verbal do Paciente" via toggle obrigatório no Drawer.
- **Push-to-Talk (PTT):** Botões dedicados para as quatro seções do SOAP (Subjetivo, Objetivo, Avaliação, Plano). Acionar uma nova gravação bloqueia outras seções até a conclusão do upload.
- **Feedback Visual:** Waveform animada (Framer Motion) indicando captura ativa e indicadores de estado (Gravando, Processando, Finalizado).
- **Editor de Revisão:** Campo de texto Rich Text para edição rápida. O botão "Confirmar e Integrar" apensa o texto à respectiva seção da evolução ativa (`usePatientEvolution`).

## 3. Arquitetura Técnica

### 3.1 Frontend (React 19)

- **Captura:** `MediaRecorder API` capturando áudio em formato WebM/Opus.
- **Gerenciamento de Estado:** Zustand para controlar o fluxo de gravação.
- **Estratégia de Upload:** O áudio é enviado como um `Blob` único (formato base64) via `POST` para o Worker. Para garantir estabilidade, gravações individuais são limitadas a 120 segundos.

### 3.2 Backend (Cloudflare Workers AI)

- **Transcrição:** `@cf/openai/whisper-large-v3-turbo` para conversão de fala em texto.
- **Refino Clínico:** `llama-3.1-70b` com System Prompt especializado em fisioterapia.
- **Orquestração:** Hono.js. O Worker deve processar o áudio de forma síncrona ou retornar um `Job ID` se o tempo de execução exceder os limites (dependendo da configuração do Worker).

### 3.3 Banco de Dados (Neon DB)

- **Tabela `clinical_scribe_logs`:**
  - `id` (UUID)
  - `organization_id` (FK - Obrigatório para RLS)
  - `patient_id` (FK)
  - `therapist_id` (FK)
  - `section` (ENUM: S, O, A, P)
  - `raw_text` (TEXT)
  - `formatted_text` (TEXT)
  - `consent_timestamp` (TIMESTAMP)
  - `consent_source` (DEFAULT 'verbal_confirmed_by_therapist')

## 4. Segurança e Privacidade (LGPD)

- **Processamento Efêmero:** O áudio é processado na memória V8 e deletado imediatamente após a transcrição. Nenhum arquivo de voz é persistido em disco.
- **Compliance:** Inserção automática de nota de rodapé sobre o uso de IA e consentimento verbal do paciente.
- **Isolamento:** Dados isolados por `organizationId` via RLS (Row Level Security).

## 5. Casos de Teste

- [ ] Gravação curta (< 10s) em cada seção SOAP.
- [ ] Gravação longa (> 1 min) com ruído de fundo.
- [ ] Edição manual do texto gerado pela IA.
- [ ] Persistência correta no banco de dados vinculada ao paciente.

## 6. Fora de Escopo (v1.0)

- Gravação contínua da sessão inteira (Ambient mode passivo).
- Suporte a múltiplos idiomas (foco inicial: PT-BR).
