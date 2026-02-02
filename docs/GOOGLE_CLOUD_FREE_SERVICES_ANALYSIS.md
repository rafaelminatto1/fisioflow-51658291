# Google Cloud Free Services - Análise Completa para FisioFlow

## Visão Geral

O FisioFlow é um sistema de gestão para clínicas de fisioterapia que pode se beneficiar significativamente dos serviços gratuitos do Google Cloud. Esta análise identifica **20+ serviços gratuitos** que podem ser implementados.

---

## 1. Serviços Já Implementados ✅

### 1.1 Firebase Authentication
- **Custo Gratuito**: 50.000 MAUs (Monthly Active Users)
- **Status**: ✅ Já implementado
- **Funcionalidades**: Email/senha, Google, Apple login
- **Limite Gratuito**:
  - 50.000 usuários ativos por mês
  - Autenticação básica gratuita
  - Phone auth (SMS) é cobrado à parte

### 1.2 Cloud Firestore
- **Custo Gratuito**: 20K writes/dia, 50K reads/dia
- **Status**: ✅ Já implementado
- **Uso**: Pacientes, agendamentos, prontuários
- **Limite Gratuito**:
  - 20.000 gravações/dia
  - 50.000 leituras/dia
  - 1 GiB armazenamento

### 1.3 Firebase Hosting
- **Custo Gratuito**: 10 GB/mês, 10 GB/mês transferência
- **Status**: ✅ Já implementado
- **Uso**: Aplicação web PWA
- **Limite Gratuito**:
  - 10 GB armazenamento
  - 10 GB transferência/mês

### 1.4 Firebase Realtime Database
- **Custo Gratuito**: 10 GB/mês, 100 conexões simultâneas
- **Status**: ✅ Já implementado (cache distribuído)
- **Uso**: Cache, rate limiting, sessões

### 1.5 Cloud Storage for Firebase
- **Custo Gratuito**: 5 GB/mês (requer plano Blaze)
- **Status**: ✅ Já implementado
- **Uso**: Upload de arquivos, imagens, vídeos de exercícios

### 1.6 Google Analytics 4 (GA4)
- **Custo Gratuito**: Ilimitado
- **Status**: ✅ Recém configurado
- **Funcionalidades**: Page views, eventos, Web Vitals

### 1.7 Firebase Remote Config
- **Custo Gratuito**: Ilimitado
- **Status**: ✅ Recém configurado
- **Funcionalidades**: Feature flags, A/B testing

### 1.8 Cloud Functions (2nd Gen)
- **Custo Gratuito**: 2M invocações/mês
- **Status**: ✅ Já implementado
- **Limite Gratuito**:
  - 2 milhões de invocações/mês
  - 400.000 GB-segundos de tempo de CPU
  - 200 GB de tráfego de rede

---

## 2. Serviços de IA/ML Gratuitos 🤖

### 2.1 Vertex AI (Gemini API)
- **Custo Gratuito**: 15 requisições/dia ( Gemini 2.5 Flash)
- **Status**: ✅ Já implementado
- **Aplicações no FisioFlow**:
  - Geração de SOAP notes
  - Sugestões de exercícios
  - Análise clínica
  - Chatbot de atendimento
- **Limites Gratuitos**:
  - Gemini 2.5 Flash: 15 requisições/dia
  - Gemini 2.5 Flash-Lite: 1.500 requisições/dia
  - Gemini 2.5 Pro: Prompt de até 1M tokens gratuito/dia

### 2.2 Cloud Speech-to-Text
- **Custo Gratuito**: 60 minutos/mês
- **Aplicação**: Transcrição automática de consultas
- **Caso de Uso**:
  - Gravar consulta e transcrever automaticamente
  - Gerar SOAP a partir da transcrição
  - Buscar em consultas anteriores

```typescript
// Implementação sugerida
async function transcribeConsulta(audioBuffer: Buffer) {
  const speech = require('@google-cloud/speech').v2;
  const client = new speech.SpeechClient();

  const [response] = await client.recognize({
    recognizer: `projects/fisioflow-migration/locations/global/recognizers/_`,
    config: {
      autoDecodingConfig: {},
      languageCodes: ['pt-BR'],
      model: 'medical_dictation', // Modelo otimizado para saúde
    },
    content: audioBuffer.toString('base64'),
  });

  return response.results.map(r => r.alternatives[0].transcript).join('\n');
}
```

### 2.3 Cloud Text-to-Speech
- **Custo Gratuito**: 4 milhões de caracteres/mês
- **Aplicação**:
  - Enviar mensagens de voz aos pacientes
  - Audiodescrição de exercícios
  - Acessibilidade para deficientes visuais

### 2.4 Cloud Translation API
- **Custo Gratuito**: 500K caracteres/mês
- **Aplicação**:
  - Traduzir exercícios para outros idiomas
  - Atendimento a pacientes estrangeiros
  - Traduzir prontuários

### 2.5 Cloud Vision API
- **Custo Gratuito**: 1.000 unidades/mês
- **Aplicações**:
  - OCR de documentos médicos
  - Análise de imagens de postura
  - Detecção de exercícios em vídeos

```typescript
// OCR de documentos
async function extractTextFromDocument(imageBuffer: Buffer) {
  const vision = require('@google-cloud/vision').v1;
  const client = new vision.ImageAnnotatorClient();

  const [result] = await client.documentTextDetection({
    image: { content: imageBuffer.toString('base64') },
  });

  return result.fullTextAnnotation.text;
}
```

### 2.6 Natural Language API
- **Custo Gratuito**: 5K unidades/mês
- **Aplicações**:
  - Análise de sentimento em feedbacks
  - Extração de entidades de prontuários
  - Categorização automática de consultas

### 2.7 Healthcare Natural Language AI
- **Custo Gratuito**: Consultar documentação
- **Aplicações**:
  - Extração de informações clínicas
  - Detecção de medicamentos e dosagens
  - Análise de notas clínicas

---

## 3. Serviços de Dados Gratuitos 📊

### 3.1 BigQuery (Data Warehouse)
- **Custo Gratuito**:
  - 10 GiB armazenamento
  - 1 TiB de queries/mês
- **Aplicações**:
  - Analytics avançado de pacientes
  - Relatórios financeiros históricos
  - Análise de tendências de tratamento

```sql
-- Exemplo: Pacientes inativos há 30+ dias
SELECT
  p.patient_id,
  p.full_name,
  MAX(a.appointment_date) as last_visit
FROM `fisioflow.patients` p
LEFT JOIN `fisioflow.appointments` a ON p.patient_id = a.patient_id
GROUP BY p.patient_id, p.full_name
HAVING last_visit < DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
```

### 3.2 BigQuery ML
- **Custo Gratuito**: Incluído no BigQuery
- **Aplicações**:
  - Prever cancelamentos (churn prediction)
  - Classificar pacientes por risco
  - Otimizar agenda de atendimentos

### 3.3 Cloud SQL (PostgreSQL)
- **Custo Gratuito**: Requer plano Blaze
- **Status**: ✅ Já implementado
- **Uso**: Dados estruturados, perfis, transações

### 3.4 Spanner (Emulator)
- **Custo Gratuito**: Local apenas
- **Aplicação**: Testes de banco distribuído

---

## 4. Serviços de Segurança Gratuitos 🔒

### 4.1 Secret Manager
- **Custo Gratuito**:
  - 6 versões ativas de secrets
  - 10.000 operações de acesso/mês
- **Aplicação**: Substituir variáveis de ambiente
- **Status**: Recomendado implementar

```typescript
// Substituir env vars por Secret Manager
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
async function getSecret(name: string) {
  const [version] = await client.accessSecretVersion({
    name: `projects/fisioflow-migration/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString();
}
```

### 4.2 Cloud Armor
- **Custo Gratuito**: Regras de pré-configuração
- **Aplicação**: Proteção contra DDoS, WAF

### 4.3 IAM (Identity and Access Management)
- **Custo Gratuito**: Ilimitado
- **Status**: ✅ Já implementado
- **Uso**: Controle de acesso por roles

### 4.4 Audit Logs
- **Custo Gratuito**: 1 GB/mês de admin activity logs
- **Aplicação**: Compliance, auditoria

---

## 5. Serviços de Monitoramento Gratuitos 📈

### 5.1 Firebase Crashlytics
- **Custo Gratuito**: Ilimitado
- **Status**: Recomendado implementar
- **Funcionalidades**:
  - Crash reports em tempo real
  - Stack traces completas
  - Agrupamento de erros

### 5.2 Firebase Performance Monitoring
- **Custo Gratuito**: Ilimitado
- **Status**: Recomendado implementar
- **Funcionalidades**:
  - Tempo de resposta de APIs
  - Renderização de telas
  - Network traces

### 5.3 Cloud Monitoring
- **Custo Gratuito**: Métricas básicas
- **Funcionalidades**:
  - Uptime monitoring
  - Alertas personalizados
  - Dashboards

### 5.4 Cloud Logging
- **Custo Gratuito**:
  - 50 GB de logs mensais
  - Admin activity logs ilimitados
- **Aplicação**: Centralizar logs de Cloud Functions

### 5.5 Error Reporting
- **Custo Gratuito**: Ilimitado
- **Funcionalidades**:
  - Agrupamento de erros
  - Notificações em tempo real
  - Integração com Sentry

---

## 6. Serviços de Integração Gratuitos 🔗

### 6.1 Cloud Pub/Sub
- **Custo Gratuito**: 10 GB de dados/mês
- **Aplicação**:
  - Filas de processamento
  - Event-driven architecture
  - Substituir Inngest para workflows simples

```typescript
// Substituir Inngest com Pub/Sub
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const topic = pubsub.topic('appointment-reminders');

// Publicar evento
await topic.publishJSON({
  appointmentId: '123',
  patientPhone: '+5511999999999',
  reminderTime: new Date(Date.now() + 3600000).toISOString(),
});
```

### 6.2 Cloud Tasks
- **Custo Gratuito**: 1M tarefas/mês
- **Aplicação**:
  - Filas de envio de emails
  - Processamento em background
  - Retry automático

### 6.3 Cloud Scheduler
- **Custo Gratuito**: 3 jobs/mês
- **Status**: Recomendado expandir uso
- **Aplicações**:
  - Relatórios diários/semanais
  - Limpeza de dados antigos
  - Backup automático

### 6.4 Cloud Workflows
- **Custo Gratuito**: 5.000 steps/mês
- **Aplicação**:
  - Orquestrar múltiplas Cloud Functions
  - Workflows complexos de notificações
  - Substituir Inngest

---

## 7. Serviços de Rede Gratuitos 🌐

### 7.1 Cloud CDN
- **Custo Gratuito**: 10 GB de egress/mês
- **Aplicação**: Cache de assets estáticos

### 7.2 Cloud Load Balancing
- **Custo Gratuito**: Regras de forwarding
- **Aplicação**: Balanceamento de carga

### 7.3 Cloud DNS
- **Custo Gratuito**:
  - 50% de consultas de DNS
  - 1.2M consultas/mês por zona
- **Aplicação**: Gerenciar domínios

---

## 8. Serviços de Developer Tools Gratuitos 🛠️

### 8.1 Cloud Build
- **Custo Gratuito**: 120 minutos/dia
- **Aplicação**: CI/CD automatizado
- **Status**: Recomendado substituir GitHub Actions parcialmente

### 8.2 Artifact Registry
- **Custo Gratuito**: 500 MB de armazenamento
- **Aplicação**: Docker images, npm packages

### 8.3 Cloud Source Repositories
- **Custo Gratuito**: 50 GB de armazenamento
- **Aplicação**: Git privado hospedado

### 8.4 Cloud Deploy
- **Custo Gratuito**: 50 releases/mês
- **Aplicação**: Continuous Delivery para GKE e Cloud Run

---

## 9. Serviços de Healthcare Gratuitos 🏥

### 9.1 Healthcare API
- **Custo Gratuito**: Consultar documentação
- **Funcionalidades**:
  - FHIR store (formato padrão de saúde)
  - DICOM store (imagens médicas)
  - HL7 v2 store (mensagens de saúde)

```typescript
// Armazenar dados em formato FHIR
import { HealthcareServiceClient } from '@google-cloud/healthcare';

const client = new HealthcareServiceClient();
async function storePatientAsFHIR(patientData: any) {
  const [resource] = await client.projects.locations.datasets.fhirStores.fhir.store({
    parent: 'projects/fisioflow-migration/locations/us-central1/datasets/patients/fhirStores/patients',
    resource: {
      resourceType: 'Patient',
      name: [{ text: patientData.full_name }],
      birthDate: patientData.date_of_birth,
    },
  });
  return resource;
}
```

### 9.2 Cloud Healthcare API - NLP
- **Custo Gratuito**: Consultar documentação
- **Funcionalidades**:
  - Extração de informações clínicas
  - Detecção de entidades médicas
  - Análise de sentimentos em notas clínicas

---

## 10. Serviços de ML Ops Gratuitos 🔄

### 10.1 Vertex AI Experiments
- **Custo Gratuito**: Ilimitado
- **Aplicação**: Rastrear experimentos de ML

### 10.2 Vertex AI Pipelines
- **Custo Gratuito**: 1 run/mês
- **Aplicação**: Orquestrar pipelines de ML

### 10.3 Model Registry
- **Custo Gratuito**: Ilimitado
- **Aplicação**: Versionar modelos customizados

---

## 11. Matriz de Prioridades para FisioFlow

### 🔴 ALTA PRIORIDADE (Implementar Imediatamente)

| Serviço | Benefício | Custo de Implementação |
|---------|-----------|------------------------|
| **Secret Manager** | Segurança de credenciais | Baixo |
| **Crashlytics** | Monitorar crashes | Baixo |
| **Performance Monitoring** | Otimizar performance | Baixo |
| **Cloud Logging** | Centralizar logs | Médio |
| **Speech-to-Text** | Transcrição de consultas | Médio |

### 🟡 MÉDIA PRIORIDADE (Implementar em 1-2 meses)

| Serviço | Benefício | Custo de Implementação |
|---------|-----------|------------------------|
| **BigQuery** | Analytics avançado | Médio |
| **Pub/Sub** | Event-driven architecture | Médio |
| **Cloud Tasks** | Processamento assíncrono | Médio |
| **Text-to-Speech** | Acessibilidade | Médio |
| **Translation API** | Multi-idioma | Baixo |

### 🟢 BAIXA PRIORIDADE (Considerar Futuramente)

| Serviço | Benefício | Custo de Implementação |
|---------|-----------|------------------------|
| **Healthcare API** | Compliance FHIR | Alto |
| **Vision API** | Análise de imagens | Alto |
| **Natural Language** | Análise de sentimento | Médio |
| **Cloud CDN** | Performance global | Baixo |
| **Cloud Build** | CI/CD alternativo | Médio |

---

## 12. Estimativa de Economia Mensal

Com a implementação de todos os serviços gratuitos:

| Categoria | Serviço | Economia Mensal Estimada |
|-----------|---------|--------------------------|
| Autenticação | Firebase Auth | ~$50 (vs Auth0) |
| Banco de Dados | Firestore + Cloud SQL | ~$100-200 |
| Hosting | Firebase Hosting | ~$20 |
| Functions | Cloud Functions | ~$50-100 |
| Analytics | GA4 | ~$100 (vs Mixpanel) |
| IA/ML | Vertex AI | ~$200-500 |
| Monitoring | Crashlytics + Performance | ~$50 |
| **TOTAL** | | **~$570-1020/mês** |

**Economia Anual Estimada: $6.840 - $12.240**

---

## 13. Roadmap de Implementação

### Fase 1: Monitoramento e Segurança (Semana 1-2)
- [ ] Implementar Firebase Crashlytics
- [ ] Implementar Performance Monitoring
- [ ] Migrar secrets para Secret Manager
- [ ] Configurar Cloud Logging

### Fase 2: IA e Transcrição (Semana 3-4)
- [ ] Implementar Speech-to-Text para consultas
- [ ] Integrar transcrição com geração de SOAP
- [ ] Implementar Text-to-Speech para acessibilidade
- [ ] Configurar Translation API

### Fase 3: Dados e Analytics (Semana 5-6)
- [ ] Configurar BigQuery para analytics avançado
- [ ] Implementar consultas SQL customizadas
- [ ] Criar dashboards no Looker Studio
- [ ] Configurar Dataflow para ETL

### Fase 4: Integrações (Semana 7-8)
- [ ] Migrar filas para Pub/Sub
- [ ] Implementar Cloud Tasks para background jobs
- [ ] Expandir Cloud Scheduler para mais crons
- [ ] Configurar Workflows para orquestração

### Fase 5: Healthcare (Semana 9-10)
- [ ] Implementar Healthcare API (FHIR)
- [ ] Migrar prontuários para formato FHIR
- [ ] Configurar DICOM store para imagens
- [ ] Implementar NLP para análise clínica

---

## 14. Exemplos de Implementação

### Exemplo 1: Transcrição de Consulta com SOAP Automático

```typescript
// functions/src/api/consultation-transcription.ts
import speech from '@google-cloud/speech';
import { aiSoapGeneration } from '../ai/soap-generation';

const client = new speech.v2.SpeechClient();

export const transcribeConsultation = functions.https.onCall(async (data) => {
  const { audioBase64, appointmentId } = data;

  // 1. Transcrever áudio
  const [response] = await client.recognize({
    recognizer: 'projects/fisioflow-migration/locations/global/recognizers/_',
    config: {
      autoDecodingConfig: {},
      languageCodes: ['pt-BR'],
      model: 'medical_dictation',
      enableAutomaticPunctuation: true,
    },
    content: audioBase64,
  });

  const transcript = response.results
    .map(r => r.alternatives[0].transcript)
    .join('\n');

  // 2. Gerar SOAP a partir da transcrição
  const soap = await aiSoapGeneration({
    transcript,
    patientId: data.patientId,
    therapistId: data.therapistId,
  });

  // 3. Salvar no Firestore
  await admin.firestore().collection('medical_records').add({
    appointment_id: appointmentId,
    transcript,
    soap_note: soap,
    created_at: new Date().toISOString(),
  });

  return { transcript, soap };
});
```

### Exemplo 2: Pub/Sub para Lembretes de Agendamento

```typescript
// functions/src/workflows/appointment-reminders.ts
import { PubSub } from '@google-cloud/pubsub';

const pubsub = new PubSub();
const reminderTopic = pubsub.topic('appointment-reminders');

// Quando agendamento é criado, agendar lembrete
export const scheduleReminder = functions.firestore
  .onDocumentCreated('appointments/{appointmentId}', async (event) => {
    const appointment = event.data.data();
    const { start_time, patient_id } = appointment;

    // Calcular tempo até consulta (ex: 24h antes)
    const reminderTime = new Date(start_time);
    reminderTime.setHours(reminderTime.getHours() - 24);

    // Publicar no Pub/Sub com delay
    await reminderTopic.publishJSON({
      appointmentId: event.params.appointmentId,
      patientId,
      reminderTime: reminderTime.toISOString(),
    });
  });

// Cloud Function que processa lembretes
export const sendReminder = functions.pubsub
  .topic('appointment-reminders')
  .onPublish(async (message) => {
    const { appointmentId, patientId } = message.json;

    // Buscar dados do paciente
    const patient = await admin.firestore()
      .collection('patients')
      .doc(patientId)
      .get();

    // Enviar WhatsApp/Email
    await sendWhatsAppMessage({
      to: patient.data().phone,
      template: 'appointment_reminder',
      parameters: { appointmentId },
    });
  });
```

### Exemplo 3: Secret Manager para Credenciais

```typescript
// functions/src/lib/secrets.ts
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const PROJECT_ID = 'fisioflow-migration';

export async function getSecret(name: string): Promise<string> {
  const [version] = await client.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${name}/versions/latest`,
  });

  return version.payload.data.toString();
}

// Uso
const whatsappToken = await getSecret('whatsapp-access-token');
const resendKey = await getSecret('resend-api-key');
```

---

## 15. Referências

- [Google Cloud Free Tier](https://cloud.google.com/free)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)
- [BigQuery Free Tier](https://cloud.google.com/bigquery/pricing)
- [Secret Manager Pricing](https://cloud.google.com/secret-manager/pricing)
- [Healthcare API](https://cloud.google.com/healthcare-api/docs)

---

**Documento gerado em:** 01/02/2026
**Projeto:** FisioFlow Migration
**Versão:** 1.0
