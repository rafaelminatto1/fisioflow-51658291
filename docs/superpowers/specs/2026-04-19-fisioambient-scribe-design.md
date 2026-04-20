# Spec Técnica: FisioAmbient (AI Scribe) v1.0

## 1. Visão Geral
O **FisioAmbient** é um assistente de documentação clínica por voz que automatiza a criação de notas SOAP, reduzindo o tempo administrativo dos fisioterapeutas através de inteligência artificial na borda (Edge AI).

## 2. Experiência do Usuário (UI/UX)
- **Scribe Drawer:** Painel lateral persistente acessível em todas as telas de prontuário do paciente.
- **Push-to-Talk (PTT):** Botões dedicados para as quatro seções do SOAP (Subjetivo, Objetivo, Avaliação, Plano).
- **Feedback Visual:** Waveform animada (Framer Motion) indicando captura ativa e indicadores de estado (Gravando, Processando, Finalizado).
- **Editor de Revisão:** Campo de texto Rich Text para edição rápida antes da confirmação final no prontuário.

## 3. Arquitetura Técnica
### 3.1 Frontend (React 19)
- **Captura:** `MediaRecorder API` capturando áudio em formato WebM/Opus.
- **Gerenciamento de Estado:** Zustand para controlar o fluxo de gravação e transcrição.
- **Processamento Local:** Fragmentação do áudio para upload otimizado.

### 3.2 Backend (Cloudflare Workers AI)
- **Transcrição:** `whisper-large-v3-turbo` para conversão de fala em texto com alta fidelidade terminológica.
- **Refino Clínico:** `llama-3.1-70b` com System Prompt especializado em fisioterapia para estruturar e normalizar a nota.
- **Orquestração:** Hono.js gerenciando as rotas de streaming e segurança.

### 3.3 Banco de Dados (Neon DB)
- **Tabela `clinical_scribe_logs`:**
  - `id` (UUID)
  - `patient_id` (FK)
  - `therapist_id` (FK)
  - `section` (ENUM: S, O, A, P)
  - `raw_text` (TEXT)
  - `formatted_text` (TEXT)
  - `consent_timestamp` (TIMESTAMP)

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
