# Análise de Serviços Firebase Gratuito para FisioFlow
> Data: 23 de Fevereiro de 2026
> Projeto: FisioFlow - Sistema de Fisioterapia

---

## Sumário Executivo

O **FisioFlow** já utiliza vários serviços Firebase de forma eficiente. Este documento analisa os serviços atualmente implementados e identifica oportunidades de melhoria utilizando serviços **gratuitos** (planos Spark e Blaze) do Firebase.

### Status Atual
| Serviço | Status | Observação |
|-----------|---------|------------|
| Authentication | ✅ Implementado | Email/Password, Google, Apple |
| Cloud Firestore | ✅ Implementado | Regras de segurança otimizadas |
| Cloud Storage | ✅ Implementado | Regras para PHI (saúde) |
| Cloud Functions | ✅ Implementado | Backend em Node.js |
| Cloud Messaging (FCM) | ✅ Implementado | Notificações push |
| Analytics | ✅ Implementado | Eventos customizados |
| Performance Monitoring | ✅ Implementado | Traces customizados |
| Crashlytics | ⚠️ Parcial | Stub implementado, não ativo |
| App Check | ⚠️ Parcial | Middleware existe, não ativado |
| Remote Config | ⚠️ Parcial | Módulo criado, não integrado |
| A/B Testing | ❌ Não implementado | Potencial alto |
| App Distribution | ❌ Não implementado | Oportunidade para beta testing |
| ML Kit Pose Detection | ❌ Não implementado | Potencial alto para fisioterapia |

---

## 1. Serviços Firebase Gratuitos (Plano Spark)

### 1.1 Serviços Completamente Gratuitos (Sem Limites)

| Serviço | Uso no FisioFlow | Recomendação |
|----------|-------------------|--------------|
| **A/B Testing** | Não implementado | 🔥 ALTA PRIORIDADE |
| **Analytics** | ✅ Implementado | Expandir eventos |
| **App Check** | ⚠️ Middleware existe | 🔥 ALTA PRIORIDADE - Ativar |
| **App Distribution** | Não implementado | 🔥 ALTA PRIORIDADE |
| **Remote Config** | ⚠️ Módulo criado | 🔥 ALTA PRIORIDADE - Integrar |
| **Crashlytics** | ⚠️ Stub | MÉDIA PRIORIDADE |

### 1.2 Serviços com Limites Gratuitos

#### Cloud Firestore
| Recurso | Limite Gratuito | Uso Atual |
|---------|-----------------|------------|
| Dados armazenados | 1 GiB | Monitorar |
| Network egress | 10 GiB/mês | Monitorar |
| Document writes | 20.000/dia | Monitorar |
| Document reads | 50.000/dia | Monitorar |
| Document deletes | 20.000/dia | Monitorar |

#### Cloud Functions (requer Blaze)
| Recurso | Limite Gratuito (Blaze) | Nota |
|---------|-------------------------|-------|
| Invocações | 2.000.000/mês | Suficiente para início |
| GB-seconds | 400.000/mês | Compute time |
| CPU-seconds | 200.000/mês | CPU time |
| Rede de saída | 5 GB/mês | API calls externas |

**Importante:** Cloud Functions NÃO estão disponíveis no plano Spark. O projeto já usa Blaze.

#### Cloud Storage (requer Blaze)
| Recurso | Limite Gratuito (Blaze) |
|---------|-------------------------|
| Dados armazenados | 5 GB |
| Download bandwidth | 1 GiB/mês |
| Upload bandwidth | 1 GiB/mês |

#### Authentication
| Recurso | Limite Gratuito |
|---------|-----------------|
| Monthly Active Users (MAUs) | 50.000 |
| SAML/OIDC | 50 MAUs |
| Phone auth | Cobrado por SMS (~$0,01-$0,06/SMS) |

---

## 2. Serviços Implementados - Análise Detalhada

### 2.1 Firebase Authentication ✅
**Status:** Implementado com Email/Password, Google, Apple Sign-In

**O que está bom:**
- Múltiplos provedores configurados
- Custom claims para RBAC (Role-Based Access Control)

**O que pode melhorar:**
- Ativar Multi-Factor Authentication (MFA) via Identity Platform
- Implementar email verification obrigatório para novos cadastros
- Usar SAML/OIDC para clínicas grandes (integração SSO corporativo)

**Recomendações de Segurança para Healthcare:**
```javascript
// No middleware de auth (já parcialmente implementado)
- Configurar quotas menores para prevenir brute-force
- Habilitar proteção contra enumeração de email
- Usar custom claims para role management (já feito)
- Considerar biometria via @capgo/capacitor-native-biometric
```

### 2.2 Cloud Firestore ✅
**Status:** Implementado com regras de segurança otimizadas

**O que está bom:**
- Helper functions com custom claims (sem reads desnecessários)
- RBAC para profissionais, pacientes, admins
- Coleções para compliance (user_consents, privacy_acceptances)
- Regras para PHI (Protected Health Information)

**O que pode melhorar:**
- Adicionar mais índices compostos para queries complexas
- Implementar TTL (time-to-live) para dados temporários
- Considerar sharding para collections de alto volume

**Best Practices Atuais Implementadas:**
```javascript
// firestore.rules (linhas 9-46)
function hasRole(role) {
  return isAuthenticated() && request.auth.token.role == role;
}

function isProfessional() {
  return isAuthenticated() && (request.auth.token.isProfessional == true ||
         request.auth.token.role in ['fisioterapeuta', 'estagiario', 'owner', 'admin']);
}
```

### 2.3 Cloud Storage ✅
**Status:** Implementado com regras para PHI

**O que está bom:**
- Reglas específicas para dados de saúde (photos, soap-notes)
- Limite de 50MB para arquivos PHI (App Store compliance)
- Separação clara entre públicos e privados
- Regras deny-all como fallback

**O que pode melhorar:**
- Implementar upload resumável para arquivos grandes
- Adicionar compressão automática de imagens via Cloud Functions
- Implementar CDN ou signed URLs de longa duração para exercícios

### 2.4 Cloud Functions ✅
**Status:** Implementado com diversos serviços

**O que está bom:**
- Arquitetura modular separada por funcionalidades
- Integração com GenKit AI, Stripe, Resend, etc.
- Middlewares para auth, rate-limit, app-check
- Scheduled functions para reminders

**O que pode melhorar:**
- Implementar retry com exponential backoff
- Usar mais triggers de Firestore (onCreate, onUpdate) para background tasks
- Implementar filas via Pub/Sub para tarefas pesadas

### 2.5 Cloud Messaging (FCM) ✅
**Status:** Implementado com FCMService

**O que está bom:**
- Multicast para múltiplos tokens
- Limpeza automática de tokens inválidos
- Integração com profiles collection

**O que pode melhorar:**
- Implementar topic messaging para segmentação (por clínica, por tipo de notificação)
- Usar notification channels no Android
- Implementar priority levels para notificações críticas

### 2.6 Analytics ✅
**Status:** Implementado com eventos customizados extensivos

**O que está bom:**
- Eventos para todas as funcionalidades principais (auth, patients, appointments, exercises, etc.)
- Eventos de gamificação (level_up, achievement_unlocked, streak_achieved)
- Eventos de AI (ai_soap_generated, ai_suggestion_accepted)
- Centralização em `src/lib/analytics/events.ts`

**O que pode melhorar:**
- Implementar funis de conversão (funnel analytics)
- Configurar audiences para remarketing
- Implementar eventos de ecommerce (para planos/assessments)

**Eventos Atuais (750 linhas de código):**
- Autenticação: login, logout, sign_up
- Pacientes: patient_created, patient_viewed, patient_updated
- Agendamentos: appointment_created, appointment_cancelled, appointment_completed
- Evoluções: evolution_created, evolution_updated, ai_soap_generated
- Exercícios: exercise_created, exercise_plan_created, exercise_completed
- Progresso: pain_level_recorded, pain_map_updated, measurement_recorded
- AI: ai_suggestion_shown, ai_suggestion_accepted, ai_suggestion_rejected
- Gamificação: points_earned, level_up, achievement_unlocked
- CRM: lead_captured, campaign_sent, email_opened
- Financeiro: invoice_generated, payment_received

### 2.7 Performance Monitoring ✅
**Status:** Implementado com FirebasePerformanceTrace

**O que está bom:**
- Traces customizadas com atributos e métricas
- HttpTrace para chamadas HTTP
- Middleware withPerformanceTracing
- PerformanceCounter para contadores

**O que pode melhorar:**
- Adicionar mais traces em paths críticos (loading paciente, salvar SOAP)
- Configurar custom metrics para tempo de renderização
- Implementar screen rendering traces

### 2.8 Crashlytics ⚠️
**Status:** Stub implementado em `functions/src/lib/crashlytics.js`

**O que está bom:**
- Arquitetura pronta para uso

**O que falta:**
- Integração real do SDK no frontend (React Native apps)
- Configuração de user context
- Integração com Sentry (já existe @sentry/react no package.json)

**Recomendação:**
```javascript
// Para apps iOS/Android, usar @react-native-firebase/crashlytics
// Já existe expo-notifications no package.json
// Considerar também @sentry/react-native que já está instalado
```

### 2.9 App Check ⚠️
**Status:** Middleware existe em `functions/src/middleware/app-check.js` mas não ativado

**O que está bom:**
- Versão flexível que permite desenvolvimento sem tokens
- Wrapper `withAppCheck` para funções
- Funções helper para verificação

**O que falta:**
- Configuração no frontend (iOS/Android)
- Ativação no Console Firebase
- Enforcement nas Cloud Functions

**Citação do código atual:**
```javascript
// functions/src/middleware/app-check.js:53-74
// NOTA: App Check temporariamente desabilitado até ser configurado no frontend
function verifyAppCheck(request) {
  var isProduction = process.env.NODE_ENV === 'production' ||
                     process.env.FUNCTIONS_EMULATOR !== 'true';
  // Em produção, rejeitar requisições sem App Check (se não for emulador)
  if (isProduction && !request.app && process.env.FUNCTIONS_EMULATOR !== 'true') {
    console.warn('[App Check] Requisição sem token em produção...');
    return;
  }
}
```

### 2.10 Remote Config ⚠️
**Status:** Módulo criado em `src/lib/featureFlags/` mas não integrado

**O que está bom:**
- Módulo barrel export organizado
- Integração com Statsig como fallback
- Hooks React prontos

**O que falta:**
- Configurar parâmetros no Console Firebase
- Integrar chamadas de fetch nas telas principais
- Implementar caching offline

---

## 3. Oportunidades de Implementação

### 3.1 Firebase App Distribution 🔥 ALTA PRIORIDADE

**O que é:**
- Ferramenta gratuita para distribuir versões beta do app
- Suporta iOS (IPA) e Android (APK/AAB)
- Gerenciamento de testers por email
- Builds disponíveis por 150 dias

**Benefícios para FisioFlow:**
1. **Beta Testing com Fisioterapeutas:** Testar novas features antes do release
2. **Test Automation Integration:** Integração com Fastlane/CI
3. **Crashlytics Integration:** Ver stability das builds beta
4. **In-App Updates:** Testers podem atualizar direto no app

**Implementação:**

**iOS (Expo/EAS):**
```json
// apps/professional-ios/app.json - Adicionar
{
  "expo": {
    "plugins": [
      [
        "@react-native-firebase/app-distribution",
        {
          "androidAppId": "com.fisioflow.professional",
          "iosAppId": "com.fisioflow.professional.ios"
        }
      ]
    ]
  }
}
```

**Setup de Testers:**
```javascript
// functions/src/admin/add-beta-tester.js
exports.addBetaTester = onCall(async (data, context) => {
  // Via Firebase CLI ou console
  // firebase appdistribution:testers:add email@tester.com --group "fisioterapeutas"
});
```

**Benefícios Imediatos:**
- Redução de bugs em produção
- Feedback de usuários reais (fisioterapeutas)
- Testes de UI/UX em dispositivos reais

---

### 3.2 Firebase A/B Testing 🔥 ALTA PRIORIDADE

**O que é:**
- Rodar experimentos com diferentes variantes de features
- Testar mudanças de UI, features, mensagens
- Integration nativa com Remote Config
- Analisar impacto em métricas

**Casos de Uso para FisioFlow:**

1. **Testar nova UI de agendamento:**
```
Variante A: Atual (drag & drop)
Variante B: Simplificado (formulário)
Métrica: taxa de conclusão de agendamento
```

2. **Testar onboarding de pacientes:**
```
Variante A: Onboarding em 5 passos
Variante B: Onboarding em 3 passos
Métrica: taxa de conclusão de cadastro
```

3. **Testar sistema de gamificação:**
```
Variante A: Pontuação padrão
Variante B: Pontuação dobrada (primeira semana)
Métrica: retenção de usuários (day 7)
```

4. **Testar AI features:**
```
Variante A: Sugestões de IA sempre visíveis
Variante B: Sugestões de IA sob demanda
Métrica: taxa de aceitação de sugestões
```

**Implementação:**

**Setup de Experimento:**
```javascript
// src/lib/analytics/ab-testing.ts
import { getRemoteConfig, fetchAndActivate } from 'firebase/remote-config';
import { logEvent } from 'firebase/analytics';

export async function getABVariant(experimentId: string) {
  const remoteConfig = getRemoteConfig();
  await fetchAndActivate(remoteConfig);

  // Retorna variante baseada em experimento
  const variant = remoteConfig.getValue(experimentId).asString();

  // Log exposure
  logEvent(analytics, 'ab_test_exposed', {
    experiment_id: experimentId,
    variant,
  });

  return variant;
}

// Uso
const showNewDashboard = await getABVariant('new_dashboard_ui') === 'treatment';
```

**Configuração no Console Firebase:**
1. Criar parâmetro Remote Config
2. Criar experimento A/B Testing
3. Definir variantes (A/B/C)
4. Configurar métricas de sucesso (retenção, conversão)

**Best Practices:**
- Começar com 1-5% de tráfego
- Monitorar métricas secundárias (crashes, churn)
- Ter rollback plan pronto (Remote Config)
- Não testar features críticas para negócio sem backup

---

### 3.3 Firebase ML Kit Pose Detection 🔛 MÉDIA PRIORIDADE (BETA)

**O que é:**
- Detecção de 33 landmarks 3D do corpo humano
- Funciona offline (on-device)
- Performance até 45 FPS em iPhone X
- API em Beta (sem SLA)

**Casos de Uso para Fisioterapia:**

1. **Monitoramento de Exercícios em Tempo Real:**
   - Detectar agachamentos corretos
   - Contar repetições de exercícios
   - Verificar forma/postura
   - Fornecer feedback imediato

2. **Reabilitação Remota:**
   - Monitorar exercícios domiciliares
   - Validar que exercícios são feitos corretamente
   - Acompanhar progresso ao longo do tempo

3. **Avaliação de ADM (Amplitude de Movimento):**
   - Medir range de motion automaticamente
   - Comparar com baseline do paciente
   - Track progresso de reabilitação

**Implementação:**

**Considerações Importantes:**
- API está em Beta (sem SLA)
- Não usar para features críticas
- Ter fallback manual quando detection falhar

**Integração Exemplo:**
```javascript
// src/components/exercises/PoseExerciseTracker.tsx
import { PoseDetection, PoseLandmarker } from '@mediapipe/pose';
// Nota: O projeto já usa @mediapipe/pose no package.json

const ExerciseTracker = ({ exerciseId, onRepetition }) => {
  // O projeto já tem MediaPipe integrado
  // Verificar: @mediapipe/tasks-vision já está no package.json

  // Melhorar integração com ML Kit quando disponível
  // ou continuar com MediaPipe que já está funcionando

  return (
    <Camera onFrame={detectPose} />
  );
};
```

**Análise de Estado Atual:**
O FisioFlow JÁ usa MediaPose no package.json:
```json
"@mediapipe/pose": "^0.5.1675469404",
"@mediapipe/tasks-vision": "^0.10.22-rc.20250304"
```

**Recomendação:**
- Continuar com MediaPipe (mais estável atualmente)
- Avaliar ML Kit quando sair do Beta
- Considerar BlazePose (Google) como alternativa

---

### 3.4 Firebase App Distribution + CI/CD 🔥 ALTA PRIORIDADE

**Integração com GitHub Actions:**

```yaml
# .github/workflows/beta-distribution.yml
name: Beta Distribution

on:
  push:
    branches: [develop]

jobs:
  build-and-distribute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build iOS Beta
        run: |
          eas build --profile development --platform ios

      - name: Distribute via Firebase
        run: |
          firebase appdistribution:distribute \
            --app <ios-app-id> \
            --groups fisioterapeutas-beta \
            --release-notes "Novas features de agendamento" \
            ios/build/app.ipa
```

---

### 3.5 Ativar App Check 🔥 ALTA PRIORIDADE

**Passos para Implementação:**

**1. Configurar no Console Firebase:**
- Ir para App Check
- Registrar apps (iOS, Android, Web)
- Obter App ID e keys

**2. iOS Configuration:**
```swift
// apps/professional-ios/ios/AppDelegate.swift
import Firebase
import FirebaseAppCheck

func application(_ application: UIApplication,
               didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

  // Configurar App Check com App Attest (nível mais alto)
  let provider = AppAttestProvider(appID: "<app-id>")

  AppCheck.setAppCheckProviderFactory(provider)

  return true
}
```

**3. Android Configuration:**
```kotlin
// apps/professional-ios/android/app/src/main/.../MainActivity.kt
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Em desenvolvimento
    if (BuildConfig.DEBUG) {
      val firebaseAppCheck = FirebaseAppCheck.getInstance()
      firebaseAppCheck.installAppCheckProviderFactory(
        DebugAppCheckProviderFactory.getInstance()
      )
    } else {
      // Em produção
      val firebaseAppCheck = FirebaseAppCheck.getInstance()
      firebaseAppCheck.installAppCheckProviderFactory(
        PlayIntegrityAppCheckProviderFactory.getInstance()
      )
    }
  }
}
```

**4. Web Configuration:**
```javascript
// src/lib/firebase/app-check.ts
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('site-key'),
  isTokenAutoRefreshEnabled: true,
});
```

**5. Enforcement:**
```javascript
// functions/src/api/appointments.js (atualizar)
import { verifyAppCheckStrict } from '../middleware/app-check';

export const createAppointment = onCall(async (request, context) => {
  // Ativar verificação estrita
  verifyAppCheckStrict(request);

  // Resto do código...
});
```

---

## 4. Roadmap de Implementação

### Fase 1: Segurança e Estabilidade (Semanas 1-2)
1. ✅ Ativar App Check em todas as Cloud Functions
2. ✅ Integrar Crashlytics no iOS e Android
3. ✅ Implementar MFA opcional em Authentication
4. ✅ Configurar email verification obrigatório

### Fase 2: Distribuição e Beta Testing (Semanas 3-4)
1. ✅ Configurar Firebase App Distribution
2. ✅ Criar grupo de testers (fisioterapeutas internos)
3. ✅ Integrar com CI/CD (GitHub Actions)
4. ✅ Implementar in-app updates para testers

### Fase 3: Otimização e Experimentação (Semanas 5-6)
1. ✅ Implementar Remote Config com parâmetros iniciais
2. ✅ Criar primeiro experimento A/B (onboarding de pacientes)
3. ✅ Configurar audiences para remarketing
4. ✅ Implementar feature flags system completo

### Fase 4: Analytics Avançado (Semanas 7-8)
1. ✅ Configurar funis de conversão
2. ✅ Implementar cohort analysis
3. ✅ Configurar BigQuery export (requer Blaze)
4. ✅ Criar dashboards personalizados

### Fase 5: AI e Inovação (Semanas 9-10)
1. ⚠️ Avaliar ML Kit Pose Detection (quando sair do Beta)
2. ⚠️ Implementar Vertex AI via Remote Config
3. ⚠️ Testar AI models via A/B Testing
4. ⚠️ Implementar personalização baseada em behavior

---

## 5. Melhores Práticas por Serviço

### 5.1 Authentication

**Best Practices:**
- ✅ Usar custom claims para RBAC (já implementado)
- ✅ Configurar quotas anti-brute-force
- ✅ Implementar email verification
- ✅ Usar biometria local (já tem @capgo/capacitor-native-biometric)

**Para Implementar:**
```javascript
// Email verification (functions/src/auth/verify-email.js)
exports.sendVerificationEmail = onCall(async (data, context) => {
  const user = await admin.auth().getUser(context.auth.uid);
  if (!user.emailVerified) {
    await admin.auth().generateEmailVerificationLink(user.email);
    // Enviar via email service (Resend já existe)
  }
});
```

### 5.2 Firestore

**Best Practices:**
- ✅ Usar custom claims em vez de Firestore reads (já feito)
- ✅ Implementar deny-all default (já feito)
- ✅ Separar PHI em subcollections (já feito)

**Para Implementar:**
```javascript
// Indexes compostos para queries comuns
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "appointments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "therapistId", "order": "ASCENDING" },
        { "fieldPath": "dateTime", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### 5.3 Storage

**Best Practices:**
- ✅ Signed URLs para acesso temporário
- ✅ Compressão automática
- ✅ CDN integration

**Para Implementar:**
```javascript
// Cloud Function para compressão de imagens
exports.compressOnUpload = onObjectFinalized(async (object) => {
  const bucket = getStorage().bucket(object.bucket);
  const tempFilePath = path.join(os.tmpdir(), object.name);

  await bucket.file(object.name).download({ destination: tempFilePath });

  // Comprimir usando Sharp (já no package.json)
  const compressed = await sharp(tempFilePath)
    .resize(800, 800, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();

  await bucket.file(object.name).save(compressed);
});
```

### 5.4 Cloud Functions

**Best Practices:**
- ✅ Usar triggers para background tasks
- ✅ Implementar retry com backoff
- ✅ Usar Pub/Sub para filas

**Para Implementar:**
```javascript
// Queue system para tarefas pesadas
exports.queueTask = onCall(async (data, context) => {
  const { PubSub } = require('@google-cloud/pubsub');
  const pubsub = new PubSub();

  await pubsub.topic('email-queue').publishJSON({
    task: 'send_welcome',
    userId: data.userId,
  });
});

// Worker
exports.emailWorker = onMessagePublished('email-queue', async (event) => {
  const { task, userId } = event.data.json;
  // Processar...
});
```

### 5.5 Analytics

**Best Practices:**
- ✅ Nomear eventos com snake_case
- ✅ Usar até 25 parâmetros por evento
- ✅ Implementar user properties

**Para Implementar:**
```javascript
// User properties
analytics.setUserProperties({
  user_type: 'fisioterapeuta',
  organization_id: 'org-123',
  subscription_tier: 'premium'
});

// Custom conversions
analytics.logEvent('purchase', {
  transaction_id: 'T12345',
  item_id: 'I12345',
  value: 149.90,
  currency: 'BRL'
});
```

### 5.6 Performance Monitoring

**Best Practices:**
- ✅ Medir traces críticos
- ✅ Adicionar custom attributes
- ✅ Implementar HTTP spans

**Para Implementar:**
```javascript
// Custom trace para loading de paciente
const trace = startTrace('load_patient_profile');
trace.putAttribute('patient_id', patientId);
trace.putAttribute('role', 'fisioterapeuta');

// Fetch data
const patient = await fetchPatient(patientId);

trace.putMetric('documents_read', documentCount);
trace.stop();
```

---

## 6. Considerações de Compliance (Saúde)

### 6.1 Certificações Firebase
Firebase possui as seguintes certificações (importantes para healthcare):

| Certificação | Status | Relevância |
|--------------|---------|-------------|
| **ISO 27001** | ✅ | Information security management |
| **ISO 27017** | ✅ | Cloud security controls |
| **ISO 27018** | ✅ | Privacy protection for PII |
| **SOC 1, 2, 3** | ✅ | Security and availability |
| **HIPAA BAA** | ⚠️ | Disponível mediante contrato |

### 6.2 LGPD Compliance (Brasil)

**O FisioFlow já implementa:**
- ✅ Coleções para consentimentos (`user_consents`, `consent_history`)
- ✅ Aceitação de política de privacidade (`privacy_acceptances`)
- ✅ Termos de serviço (`terms_acceptances`)
- ✅ Solicitações de exportação de dados (`data_export_requests`)
- ✅ Solicitações de exclusão (`data_deletion_requests`)

**O que pode melhorar:**
```javascript
// Cloud Function para exportação LGPD-compliant
exports.exportUserData = onCall(async (data, context) => {
  const userId = context.auth.uid;

  // Coletar todos os dados do usuário
  const userData = {
    profile: await admin.firestore().collection('profiles').doc(userId).get(),
    patients: await admin.firestore()
      .collection('patients')
      .where('userId', '==', userId)
      .get(),
    appointments: await admin.firestore()
      .collection('appointments')
      .where('therapistId', '==', userId)
      .get(),
    // ... outras collections
  };

  // Gerar PDF com assinatura criptográfica
  const pdf = generatePDF(userData);

  // Upload com signed URL (expira em 7 dias)
  const url = await uploadSignedPDF(userId, pdf);

  return { downloadUrl: url, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 };
});
```

### 6.3 HIPAA Compliance

**Requisitos para ePHI:**
1. ✅ Assinar BAA (Business Associate Agreement) com Google
2. ✅ Criptografia em repouso (Firebase faz automaticamente)
3. ✅ Criptografia em trânsito (Firebase usa TLS)
4. ✅ Audit logging (já tem `audit_logs` collection)
5. ✅ Access controls (RBAC com custom claims)
6. ✅ Backup automatizado (Firebase faz automaticamente)

**Para implementar:**
```javascript
// Audit trail para acessos a dados sensíveis
exports.logAccess = onDocumentWritten('patients/{patientId}', async (event, context) => {
  await admin.firestore().collection('audit_logs').add({
    userId: context.auth?.uid,
    action: event.after.exists() ? 'update' : 'create',
    resource: `patients/${event.params.patientId}`,
    timestamp: FieldValue.serverTimestamp(),
    ipAddress: context.rawRequest.ipAddress,
  });
});
```

---

## 7. Estimativa de Custos

### Cenário Inicial (Até 100 usuários)
| Serviço | Custo Mensal |
|----------|--------------|
| Hosting | $0 (5 GB grátis) |
| Firestore | $0 (1 GB grátis) |
| Functions | $0 (2M invocações grátis) |
| Storage | $0 (5 GB grátis) |
| Authentication | $0 (50K MAUs grátis) |
| App Check | $0 |
| Analytics | $0 |
| Crashlytics | $0 |
| A/B Testing | $0 |
| Remote Config | $0 |
| App Distribution | $0 |
| **TOTAL** | **$0** |

### Cenário Crescimento (100-1000 usuários)
| Serviço | Custo Mensal Estimado |
|----------|----------------------|
| Firestore | $5-10 (reads/writes extras) |
| Functions | $5-10 (invocações extras) |
| Storage | $5-15 (vídeos de exercícios) |
| **TOTAL** | **$15-35** |

**Observação:** Firebase oferece $300 em créditos gratuitos para projetos novos.

---

## 8. Conclusões e Recomendações

### Prioridade 1 (Implementar Imediatamente)
1. **Ativar App Check** - Middleware existe, falta configuração
2. **Implementar Crashlytics** - Stub existe, falta integração
3. **Configurar App Distribution** - Essencial para beta testing

### Prioridade 2 (Próximas 4 semanas)
4. **Implementar Remote Config** - Módulo criado, falta integração
5. **Criar primeiro experimento A/B** - Otimizar onboarding
6. **Implementar MFA opcional** - Melhorar segurança

### Prioridade 3 (Futuro)
7. **Avaliar ML Kit Pose Detection** - Quando sair do Beta
8. **Implementar BigQuery Export** - Analytics avançado
9. **Expandir eventos Analytics** - Funis de conversão

### Resumo

O FisioFlow tem uma base sólida de serviços Firebase. Os principais gaps são:

1. **Segurança:** App Check não está ativado
2. **Monitoramento:** Crashlytics não integrado
3. **Experimentação:** A/B Testing e Remote Config não utilizados
4. **Distribuição:** App Distribution não configurado

Esses serviços podem ser implementados utilizando apenas o plano gratuito do Firebase, sem custos adicionais.

---

## Referências

- [Firebase Pricing - Spark vs Blaze](https://firebase.google.cn/pricing)
- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [Firebase A/B Testing](https://firebase.google.cn/docs/ab-testing)
- [Firebase Remote Config](https://firebase.google.cn/products/remote-config)
- [App Distribution](https://firebase.google.com/docs/app-distribution)
- [ML Kit Pose Detection](https://developers.google.com/ml-kit/vision/pose-detection)
- [Cloud Functions Pricing](https://firebase.google.cn/docs/functions/pricing)
