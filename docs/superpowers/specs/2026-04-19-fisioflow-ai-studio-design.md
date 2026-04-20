# Spec Técnica: FisioFlow AI Studio v4.5

## 1. Visão Geral
O **FisioFlow AI Studio** é uma suíte de inteligência clínica projetada para operar na borda (Edge), automatizando a documentação, análise de movimento e retenção de pacientes.

## 2. Eixos de Funcionalidade

### Eixo 1: FisioAmbient (Ambient Scribe)
*   **Objetivo:** Gerar notas SOAP a partir de ditado clínico estruturado.
*   **Fluxo:**
    1.  O terapeuta aciona o microfone em seções específicas (Subjetivo, Objetivo, Avaliação, Plano).
    2.  O áudio é processado em lote via `Whisper-v3` no Cloudflare Workers AI.
    3.  O `Llama-3-70b` refina a transcrição para terminologia técnica de fisioterapia.
    4.  A nota é salva no Neon DB com um adendo de consentimento verbal do paciente (Compliance LGPD).

### Eixo 2: FisioADM (Bio-Vision ADM)
*   **Objetivo:** Medição automática de Amplitude de Movimento (ADM) via visão computacional.
*   **Tecnologia:** Mediapipe Pose Landmarker (Frontend) + TensorFlow.js.
*   **Funcionalidades:**
    *   Rastreamento automático de picos de movimento.
    *   Inserção automática de graus no prontuário.
    *   Geração de anexo visual com overlay de esqueleto (SVG/Canvas).
    *   Gráfico evolutivo comparativo.

### Eixo 3: FisioRetention (Agente de Reengajamento)
*   **Objetivo:** Prevenir churn e automatizar o relacionamento proativo.
*   **Gatilhos (Triggers):**
    *   No-show imediato (2h após horário).
    *   Inatividade no app (3 dias sem acessar exercícios).
    *   Risco de abandono (10 dias sem agendamento futuro).
*   **Ação:** Disparo automático de templates dinâmicos via WhatsApp Business API.

### Eixo 4: FisioPredict (Analytics Preditivo)
*   **Objetivo:** Estimar o número de sessões para a alta clínica.
*   **Lógica:** Modelo híbrido dinâmico.
    *   Base inicial: Média por patologia (CID-10).
    *   Ajuste contínuo: Velocidade de ganho de ADM (Eixo 2) e frequência de presença.
*   **Interface:** Indicador de "Progresso para Alta" no perfil do paciente e Dashboard de Gestão.

## 3. Arquitetura Técnica
*   **Frontend:** React 19, Lucide Icons, Framer Motion (para feedback visual da IA).
*   **Backend:** Hono.js em Cloudflare Workers AI.
*   **Banco de Dados:** Neon PostgreSQL (armazenamento de métricas e previsões).
*   **Privacidade:** Processamento de vídeo local (browser) e áudio em V8 isolates isolados.

## 4. Métricas de Sucesso
*   Redução de 60% no tempo de preenchimento de evolução.
*   Aumento de 15% na taxa de retenção (LTV).
*   Acurácia de predição de alta superior a 80% após 5 sessões.

## 5. Detalhes Eixo 3: FisioRetention
### 5.1 Gatilhos de IA
- **Algoritmo de Risco de Churn**: Analisa a frequência histórica vs. ausência de agendamentos futuros.
- **Inatividade de Exercícios**: Monitora se o paciente abriu o App do Paciente nos últimos X dias.

### 5.2 Integração WhatsApp
- Utiliza `WhatsAppService` existente.
- Novos templates: `reengajamento_clinico`, `incentivo_exercicio`, `alerta_no_show`.

## 6. Detalhes Eixo 4: FisioPredict
### 6.1 Modelo de Predição
- **Input**: CID-10 + Medições de ADM (Eixo 2) + Idade + Histórico de Sessões.
- **Output**: Probabilidade de alta em X semanas.
- **Backend**: Implementado via `Cloudflare Workers AI` usando regressão linear ou modelo de classificação leve.

## 7. Upgrade v4.6: Profundidade Clínica & Refino Visual
### 7.1 Análise de Marcha (FisioADM 2.0)
- **Modo:** Vídeo Offline (Upload).
- **Visualização:** Overlay de vetores biomecânicos e rastreamento de Centro de Massa (COM).
- **Métricas:** Oscilação de tronco, simetria de passo e deslocamento vertical.

### 7.2 OCR de Laudos (FisioAmbient 2.0)
- **Tecnologia:** Cloudflare Workers AI (Llama 3.2 Vision ou OCR clássico + Llama refino).
- **Fluxo:** Upload de foto/PDF -> Extração de achados críticos -> Inserção automática no SOAP (Objetivo).

### 7.3 Estética Aura Intelligence
- **Feedback:** "Glassmorphism" intensificado nos drawers.
- **Animações:** Transições de página com stagger e micro-interações de estado (hover/active).
