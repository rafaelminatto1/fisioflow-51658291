# FisioFlow - FASE 1: Segurança Crítica (IMPLEMENTADA)

## Data: 2025-01-29

## Resumo das Mudanças Implementadas

Esta documentação descreve as mudanças de segurança críticas implementadas na FASE 1 do plano de refatoração.

---

## 1. Firestore Security Rules - Restrições Aplicadas

### Arquivo: `firestore.rules`

#### 1.1 Organizations Collection (Linha 96)
**Antes:**
```javascript
allow read: if isAuthenticated();
```

**Depois:**
```javascript
allow read: if isAdmin() || isProfessional();
```

**Rationale:** Organizações contêm dados sensíveis da clínica. Apenas administradores e profissionais deveriam ter acesso a estas informações.

#### 1.2 Profiles Collection (Linha 108)
**Antes:**
```javascript
allow read: if isAuthenticated();
```

**Depois:**
```javascript
allow read: if isAdmin() || isProfessional() || (isAuthenticated() && request.auth.uid == userId);
```

**Rationale:** Perfis de usuário contêm informações pessoais sensíveis. Usuários devem apenas ver seu próprio perfil, enquanto admin/profissionais precisam ver perfis para gerenciar a clínica.

#### 1.3 Patients Collection (Linha 139)
**Antes:**
```javascript
allow list: if isAuthenticated();
allow get: if isAuthenticated();
```

**Depois:**
```javascript
allow list: if isAdmin() || isProfessional();
allow get: if isAdmin() || isProfessional();
```

**Rationale:** Dados de pacientes são extremamente sensíveis (HIPAA/GDPR). Apenas profissionais de saúde deveriam listar pacientes. Acesso individual ainda permite ao paciente ver seus próprios dados (regra maintainada nas linhas 147-153).

#### 1.4 Appointments Collection (Linha 171)
**Antes:**
```javascript
allow list: if isAuthenticated();
allow get: if isAuthenticated();
```

**Depois:**
```javascript
allow list: if isAdmin() || isProfessional();
allow get: if isAdmin() || isProfessional();
```

**Rationale:** Agendamentos contêm informações de saúde sensíveis. Acesso à lista deveria ser restrito a profissionais.

#### 1.5 Exercises Collection (Linha 199)
**Antes:**
```javascript
allow read: if isAuthenticated();
```

**Depois:**
```javascript
allow read: if isAdmin() || isProfessional();
```

**Rationale:** Biblioteca de exercícios é conteúdo profissional. Pacientes não deveriam ter acesso direto à biblioteca completa.

---

## 2. Storage Security Rules - Restrições Aplicadas

### Arquivo: `storage.rules`

#### 2.1 User Avatars (Linha 60)
**Antes:**
```javascript
allow read: if true;
```

**Depois:**
```javascript
allow read: if isAuthenticated();
```

**Rationale:** Fotos de perfil contêm dados biométricos. Acesso público é desnecessário e cria risco de privacidade.

#### 2.2 Public Assets (Linha 155)
**Antes:**
```javascript
allow read: if true;
```

**Depois:**
```javascript
allow read: if isAuthenticated();
```

**Rationale:** Assets públicos (logos, imagens) deveriam ser acessíveis apenas para usuários autenticados da aplicação.

---

## 3. Remoção de Valores Hardcoded

### Arquivo: `src/routes.tsx` (Linhas 243-246)

**Antes:**
```tsx
<Route path="/chatbot" element={<ProtectedRoute><MedicalChatbot userId="current-user" /></ProtectedRoute>} />
<Route path="/computer-vision" element={<ProtectedRoute><ComputerVisionExercise patientId="current-patient" /></ProtectedRoute>} />
<Route path="/intelligent-reports" element={<ProtectedRoute><IntelligentReports patientId="demo-patient" patientName="Paciente Demo" /></ProtectedRoute>} />
<Route path="/augmented-reality" element={<ProtectedRoute><AugmentedRealityExercise patientId="current-patient" /></ProtectedRoute>} />
```

**Depois:**
```tsx
<Route path="/chatbot" element={<ProtectedRoute><MedicalChatbot /></ProtectedRoute>} />
<Route path="/computer-vision/:patientId?" element={<ProtectedRoute><ComputerVisionExercise /></ProtectedRoute>} />
<Route path="/intelligent-reports/:patientId" element={<ProtectedRoute><IntelligentReports /></ProtectedRoute>} />
<Route path="/augmented-reality/:patientId?" element={<ProtectedRoute><AugmentedRealityExercise /></ProtectedRoute>} />
```

**Rationale:** IDs hardcoded criam problemas de segurança e escalabilidade. Componentes devem receber IDs via URL params ou contexto do usuário.

---

## 4. Organization ID Dinâmico

### Arquivo: `src/contexts/AuthContextProvider.tsx`

#### Mudança Implementada:

**Antes:** `organization_id: 'default-org'` (hardcoded)

**Depois:** Implementação de `getOrCreateDefaultOrganization()` que:

1. Busca organizações ativas no Firestore
2. Retorna a primeira organização encontrada
3. Cria uma organização padrão se nenhuma existir
4. Atribui dinamicamente ao usuário

**Rationale:** Hardcoded organization ID impede multi-tenancy e cria problemas quando a organização padrão não existe.

---

## Próximos Passos (Tarefas Pendentes)

### Tarefa #1: Revogar API Keys Expostas

**Status:** PENDENTE - Ação Manual Requerida

**Arquivos:**
- `.env` (linhas 11-13: Supabase keys)
- `.env` (linhas 20-21: Inngest keys)
- `.env` (linha 22: Resend API key)
- `.env` (linhas 25-31: Firebase keys)
- `.env` (linha 51: Ably API key)
- `.env` (linha 56: WhatsApp access token)
- `.env` (linha 63: Sentry DSN)

**Ações Necessárias:**
1. Revogar todas as API keys expostas nos respectivos dashboards:
   - Supabase Dashboard → Settings → API
   - Inngest Dashboard → App Settings → Keys
   - Resend Dashboard → API Settings
   - Firebase Console → Project Settings
   - Ably Dashboard → App Settings
   - Meta Business Suite → WhatsApp → API Setup
   - Sentry Dashboard → Settings → Client Keys (DSN)

2. Configurar Google Secret Manager para Cloud Functions:
   ```bash
   # Habilitar API
   gcloud services enable secretmanager.googleapis.com

   # Criar secrets
   echo "YOUR_NEW_API_KEY" | gcloud secrets create "supabase-anon-key" --data-file=-
   echo "YOUR_NEW_API_KEY" | gcloud secrets create "inngest-event-key" --data-file=-
   # ... etc para cada secret

   # Permitir que Cloud Functions acesse os secrets
   gcloud secrets add-iam-policy-binding "SECRET_NAME" \
     --member="serviceAccount:YOUR_PROJECT@appspot.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Atualizar `functions/src/init.ts` para ler do Secret Manager:
   ```typescript
   import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

   const client = new SecretManagerServiceClient();
   const name = `projects/${project_id}/secrets/${secret_id}/versions/latest`;

   const [version] = await client.accessSecretVersion({ name });
   const secretValue = version.payload.data.toString();
   ```

4. Remover `.env` do controle de versão (se ainda estiver commitado):
   ```bash
   git rm --cached .env
   echo ".env" >> .gitignore
   ```

---

## Impacto das Mudanças

### Breaking Changes Possíveis

1. **Firestore Rules:**
   - Pacientes não podem mais listar pacientes (OK - não é função deles)
   - Usuários autenticados sem perfil não podem mais ver dados (cria necessidade de melhor onboarding)

2. **Storage Rules:**
   - Imagens de perfil não são mais públicas (pode quebrar links compartilhados externamente)

3. **Rotas:**
   - Rotas de IA agora requerem parâmetros na URL (pode quebrar bookmarks ou links diretos)

### Mitigações

- Testar todas as funcionalidades após deploy
- Implementar migração de dados se necessário
- Comunicar mudanças aos usuários finais

---

## Verificação de Deploy

Antes de fazer deploy para produção, verificar:

- [ ] Todas as regras do Firestore foram atualizadas
- [ ] Todas as regras do Storage foram atualizadas
- [ ] Rotas foram atualizadas
- [ ] Organization ID não está mais hardcoded
- [ ] API keys foram revogadas
- [ ] Secret Manager está configurado
- [ ] Testes manuais foram executados

---

## Referências

- Plano completo: `REFACTORING_PLAN.md`
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/rules-structure
- Storage Security Rules: https://firebase.google.com/docs/storage/security
- Google Secret Manager: https://cloud.google.com/secret-manager/docs
