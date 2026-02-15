# 🔧 Correção de CORS Necessária

## 📋 Resumo do Problema

### O que está acontecendo:
- O app web (`moocafisio.com.br`) tenta acessar serviços em URLs Cloud Run (`.a.run.app`)
- Esses serviços Cloud Run NÃO têm CORS configurado
- Requisições OPTIONS (preflight) são rejeitadas
- Erro: `No 'Access-Control-Allow-Origin' header is present on the requested resource`

### Serviços com problema identificados:
- `https://updateappointmentv2-tfecm5cqoq-rj.a.run.app/`
- `https://listpatientsv2-tfecm5cqoq-rj.a.run.app/`
- `https://getpatientstatsv2-tfecm5cqoq-rj.a.run.app/`
- `https://listappointments-tfecm5cqoq-rj.a.run.app/`

---

## ✅ O que já está funcionando:

1. **Custom Claims configuradas** ✅
   - Usuário: `sj9b11xOjPT8Q34pPHBMUIPzvQQ2`
   - Role: admin
   - Organization ID: "default"
   - As claims já estão sendo aplicadas

2. **Cloud Functions têm CORS** ✅
   - `getProfile`, `updateAppointment`, `listPatients`, etc. usam `cors: CORS_ORIGINS`
   - As Cloud Functions estão configuradas corretamente

---

## 🛠️ O que precisa ser corrigido

### Opção 1: Unificar deployments (RECOMENDADO)

**Por que há dois tipos de deployments:**
- Cloud Functions (Firebase) - com CORS configurado ✅
- Cloud Run (Google Cloud) - sem CORS ❌

**Solução:**
1. Migrar os serviços de Cloud Run para serem Cloud Functions
2. OU configurar CORS nos serviços Cloud Run
3. OU garantir que o app web use apenas Cloud Functions URLs

### Opção 2: Adicionar CORS aos serviços Cloud Run (Rápido)

Se não for possível migrar imediatamente, adicionar CORS aos Cloud Run:

**Arquivos para modificar:**
- `functions/src/api/appointments.ts`
- `functions/src/api/patients.ts`
- `functions/src/api/patient-financial.ts`
- `functions/src/api/dashboard.ts`
- E outros arquivos que exportam handlers HTTP

**Como adicionar CORS:**
```typescript
// Importar setCorsHeaders
import { setCorsHeaders } from '../lib/cors';

// No handler exportado, adicionar antes do código existente:
export const serviceNameHttp = onRequest(
  { cors: CORS_ORIGINS, invoker: 'public' },  // ← Adicionar isso
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      setCorsHeaders(res, req);
      res.status(204).send('');
      return;
    }
    // ... restante do código
  }
);
```

**Deployar as mudanças:**
```bash
# Fazer deploy das funções atualizadas
cd functions
npm run deploy
```

---

## 📝 Logs dos erros de console que você reportou:

### Erro 1: getProfile (RESOLVIDO)
- URL: `https://southamerica-east1-fisioflow-migration.cloudfunctions.net/getProfile`
- Status: ✅ TEM CORS configurado
- Ações: Custom Claims foram configuradas

### Erro 2: updateAppointmentV2 (PROBLEMA ATUAL)
- URL: `https://updateappointmentv2-tfecm5cqoq-rj.a.run.app/`
- Status: ❌ NÃO TEM CORS configurado
- Causa: Serviço Cloud Run sem headers de CORS

### Erro 3: listPatientsV2 (PROBLEMA ATUAL)
- URL: `https://listpatientsv2-tfecm5cqoq-rj.a.run.app/`
- Status: ❌ NÃO TEM CORS configurado
- Causa: Serviço Cloud Run sem headers de CORS

### Erro 4: getPatientStatsV2 (PROBLEMA ATUAL)
- URL: `https://getpatientstatsv2-tfecm5cqoq-rj.a.run.app/`
- Status: ❌ NÃO TEM CORS configurado
- Causa: Serviço Cloud Run sem headers de CORS

---

## 💡 Recomendações

1. **Testar o app agora** seguindo as instruções abaixo
2. **Fazer logout/login** para limpar o localStorage do navegador
3. **Verificar se o erro de CORS persiste** após fazer login
4. **Se persistir, iniciar os serviços de desenvolvimento** em modo de produção ou com CORS fix

---

## 📄 Arquivos Relacionados

- Firestore Rules: `/firestore.rules`
- API URLs: `professional-app/lib/api.ts`
- CORS Library: `functions/src/lib/cors.ts`
- Service Account: `functions/service-account-key.json`
- Custom Claims Script: `fix-custom-claims.cjs`
