# 🚀 Plano de Implementação Completa: Integrações GCP Marketplace (Q3-Q4 2026)

Este documento detalha o plano de execução passo a passo para a integração das soluções Google Cloud Marketplace no ecossistema do **FisioFlow**. O objetivo é preparar o sistema para as metas de Assistente Clínico IA, Telemedicina, Wearables e Certificação ISO 27001.

---

## 📅 Fases de Implementação

A implementação foi dividida em 4 fases incrementais e seguras para garantir estabilidade e previsibilidade de custos.

### Fase 1: 🛡️ Fundações de Segurança & Compliance (ISO 27001)
*Meta: Mascarar e proteger dados de saúde (PII/PHI) e defender o perímetro.*

1.  **Habilitar GCP APIs:** Ativar o Cloud DLP (Sensitive Data Protection) e Cloud Armor.
2.  **Configurar Políticas de DLP:**
    *   Criar rotinas via Cloud Functions que escaneiam documentos/exames novos que são salvos no Firebase Storage (pasta `/exames`).
    *   Sinalizar ou ocultar automaticamente informações críticas como CPFs ou históricos clínicos muito sensíveis, gerando logs de auditoria.
3.  **Auditoria e Headers:** Revisão das regras do Firestore para garantir restrições consistentes baseadas em RBAC.

### Fase 2: 🤖 IA Clinical Assistant (Vertex AI & Gemini)
*Meta: Resumir e analisar automaticamente os prontuários dos pacientes.*

1.  **Habilitar GCP APIs:** Ativar `discoveryengine.googleapis.com` (Vertex AI Search), `generativeai.googleapis.com` (Gemini), `healthcare.googleapis.com`.
2.  **Infraestrutura Cloud Functions:**
    *   Criar uma função HTTP segura (`generateClinicalSummary`) que será invocada pelo Frontend/Mobile pelos fisioterapeutas.
3.  **Integração do Gemini:**
    *   Conectar o histórico (notas SOAP) do paciente no banco de dados e enviá-lo ao modelo Gemini com um prompt ajustado clinicamente para obter:
        *   Resumo da evolução do paciente.
        *   Sugestões de ajustes nos exercícios (baseado na biblioteca de exercícios).
4.  **Integração UI:** Criar o componente de interface "IA Assistant" dentro da visualização de cada Paciente (Prontuário Eletrônico).

### Fase 3: ⌚ Interoperabilidade e Wearables (Cloud Healthcare API)
*Meta: Centralizar os dados de relógios/dispositivos em formato padrão FHIR.*

1.  **Configurar Datastore FHIR:**
    *   Criar um "Dataset" e um "FHIR Store" usando o Cloud Healthcare API (separado do Firestore).
2.  **Ingestão de Dados via Cloud Functions:**
    *   Desenvolver endpoint/webhook (`ingestWearableData`) capaz de receber JSON bruto de integrações externas (Google Fit, Apple HealthKit) e traduzi-los para recursos FHIR (ex: `Observation` para Batimentos Cardíacos).
3.  **Dashboard UI:** Criar um painel que puxa dados do FHIR Store e exibe gráficos de recuperação no perfil do paciente.

### Fase 4: 📹 Módulo de Telemedicina (WebRTC Seguro)
*Meta: Adicionar capacidade de vídeochamadas HIPAA-Compliant.*

1.  **Seleção do Provedor de API:**
    *   Integração com uma solução como o *VideoSDK* (HIPAA compliant e fácil de usar no Frontend React e no Mobile Expo).
2.  **Gerenciamento de Salas (Backend):**
    *   Criar a função `createTelemedicineRoom`, associando o ID da sala de vídeo ao ID do agendamento (Appointment) do Firestore.
3.  **Implementação da Sala (Frontend):**
    *   Desenvolver o componente `/telemedicina/[id]` utilizando os componentes React do provedor escolhido, com features de Mudo/Câmera On-Off e chat de texto integrado.

---

## 🚦 Status Atual: **Iniciando a Implementação**

Neste momento, começaremos a **Fase 1** e a **Fase 2** simultaneamente, habilitando as APIs necessárias no projeto Google Cloud atual.
