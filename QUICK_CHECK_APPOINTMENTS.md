# Verificação Rápida - Cards de Agendamento

## 🚀 Passo a Passo Rápido

### 1. Abrir a Aplicação e Console

```bash
# Se não estiver rodando, inicie o servidor
npm run dev
```

1. Abra http://localhost:5173 no navegador
2. Pressione **F12** para abrir o DevTools
3. Vá para a aba **Console**
4. Limpe o console (ícone 🚫 ou Ctrl+L)

### 2. Navegar para Agenda

1. Faça login (se necessário)
2. Clique em **"Agenda"** no menu lateral
3. Aguarde a página carregar

### 3. Verificar Logs no Console

Procure por estas mensagens na ordem:

#### ✅ Checkpoint 1: Organization ID
```
[INFO] Schedule page - Organization ID
```

**O que verificar:**
- `hasUser: true` ✅
- `organizationId: "edc6dd27-..."` ✅ (deve ter um UUID)
- `hasOrganizationId: true` ✅

**❌ Se `organizationId: ""` ou `hasOrganizationId: false`:**
```bash
# SOLUÇÃO: Fazer logout e login novamente
# 1. Clique no avatar/menu do usuário
# 2. Clique em "Sair"
# 3. Faça login novamente
# 4. Volte para /agenda
```

#### ✅ Checkpoint 2: Query Iniciada
```
[INFO] useFilteredAppointments query
```

**O que verificar:**
- `organizationId: "edc6dd27-..."` ✅
- `enabled: true` ✅
- `viewType: "week"` ✅

#### ✅ Checkpoint 3: Buscando Dados
```
[INFO] Fetching appointments
```

**O que verificar:**
- `organizationId: "edc6dd27-..."` ✅
- `dateFrom` e `dateTo` com datas válidas ✅

**❌ Se esta mensagem NÃO aparecer:**
- O organization_id está vazio (volte ao Checkpoint 1)
- A query está desabilitada

#### ✅ Checkpoint 4: Resposta da API
```
[INFO] Appointments API response received
```

**O que verificar:**
- `hasData: true` ✅
- `dataLength: X` (onde X > 0) ✅

**❌ Se `dataLength: 0`:**
- Não existem agendamentos no banco para esta organização
- Vá para a seção "Verificar Firestore" abaixo

#### ✅ Checkpoint 5: Processamento
```
[INFO] Appointments processed successfully
```

**O que verificar:**
- `validAppointments: X` (onde X > 0) ✅
- `invalidAppointments: 0` ✅

**❌ Se `validAppointments: 0` mas `totalReceived > 0`:**
- Os dados estão corrompidos ou em formato inválido
- Veja os erros de validação no console

### 4. Verificar Painel de Diagnóstico

No topo da página `/agenda`, deve aparecer um painel laranja (apenas em DEV):

**O que verificar:**
- ✅ **Status**: "success" ou "loading"
- ✅ **Organization ID**: UUID válido (não "Não definido")
- ✅ **Appointments**: Número > 0
- ✅ **Sample Data**: Mostra dados do primeiro agendamento

**❌ Se o painel não aparecer:**
```bash
# Verifique se está em modo desenvolvimento
echo $NODE_ENV  # deve ser vazio ou "development"
```

### 5. Verificar Erros Comuns

#### Erro de CORS
```
Access to fetch at 'https://...' has been blocked by CORS
```

**Solução Automática:**
O sistema deve automaticamente usar o fallback. Procure por:
```
[WARN] CORS error detected, falling back to direct Firestore access
```

Se não aparecer, o fallback não está funcionando.

#### Erro de Permissão
```
FirebaseError: Missing or insufficient permissions
```

**Solução:**
Verificar regras de segurança do Firestore (veja seção abaixo).

#### Erro de Validação
```
[ERROR] Appointment validation failed for ID xxx
```

**Solução:**
Os dados no Firestore estão em formato inválido. Veja os detalhes do erro.

## 🔍 Verificações Adicionais

### Verificar Firestore Diretamente

1. Abra https://console.firebase.google.com/
2. Selecione o projeto **fisioflow-migration**
3. Vá para **Firestore Database**
4. Navegue até a coleção **appointments**

**Verificar:**
- ✅ Existem documentos?
- ✅ Documentos têm `organization_id: "edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82"`?
- ✅ Documentos têm campos obrigatórios?
  - `patient_id` (string UUID)
  - `patient_name` (string)
  - `date` (string "YYYY-MM-DD" ou Timestamp)
  - `start_time` (string "HH:MM")
  - `status` (string: agendado, confirmado, etc.)

### Verificar Perfil do Usuário

1. No Firestore, vá para a coleção **profiles**
2. Procure pelo documento com `email: "rafael.minatto@yahoo.com.br"`

**Verificar:**
- ✅ Campo `organization_id` existe?
- ✅ Valor: `"edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82"`?

### Testar Firestore Direto no Console

No console do navegador (na página /agenda), execute:

```javascript
// Copie e cole este código no console
(async () => {
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const { db } = await import('./src/integrations/firebase/app.js');
  
  const orgId = 'edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82';
  const q = query(
    collection(db, 'appointments'),
    where('organization_id', '==', orgId)
  );
  
  const snapshot = await getDocs(q);
  console.log('✅ Appointments encontrados:', snapshot.size);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('📄', doc.id, {
      patient: data.patient_name,
      date: data.date,
      time: data.start_time,
      status: data.status
    });
  });
})();
```

## 📊 Resultados Esperados

### ✅ Tudo Funcionando
```
[INFO] Schedule page - Organization ID
  { hasUser: true, organizationId: "edc6dd27-...", hasOrganizationId: true }

[INFO] useFilteredAppointments query
  { organizationId: "edc6dd27-...", enabled: true }

[INFO] Fetching appointments
  { organizationId: "edc6dd27-...", limit: 3000 }

[INFO] Appointments API response received
  { hasData: true, dataLength: 5 }

[INFO] Appointments processed successfully
  { validAppointments: 5, invalidAppointments: 0 }
```

**Resultado:** Cards aparecem na agenda ✅

### ❌ Organization ID Faltando
```
[INFO] Schedule page - Organization ID
  { hasUser: true, organizationId: "", hasOrganizationId: false }
```

**Solução:** Logout + Login

### ❌ Sem Dados no Firestore
```
[INFO] Appointments API response received
  { hasData: true, dataLength: 0 }
```

**Solução:** Criar agendamentos de teste ou verificar organization_id

### ❌ Dados Inválidos
```
[INFO] Appointments processed successfully
  { validAppointments: 0, invalidAppointments: 5 }
```

**Solução:** Corrigir formato dos dados no Firestore

## 🎯 Próximos Passos

Após executar estas verificações, me informe:

1. **Qual checkpoint falhou?** (1, 2, 3, 4 ou 5)
2. **Valores dos logs:**
   - `organizationId`: ?
   - `dataLength`: ?
   - `validAppointments`: ?
3. **Erros no console?** (copie e cole)
4. **O painel de diagnóstico aparece?** (sim/não)
5. **Quantos appointments no Firestore?** (verifique manualmente)

## 🔧 Soluções Rápidas

### Problema: Organization ID vazio
```bash
# 1. Logout da aplicação
# 2. Limpar cache: Ctrl+Shift+Delete
# 3. Login novamente
# 4. Verificar novamente
```

### Problema: CORS bloqueando
```bash
# O fallback deve ativar automaticamente
# Procure por: "[WARN] CORS error detected, falling back..."
# Se não aparecer, há um problema no código do fallback
```

### Problema: Sem dados no Firestore
```bash
# Criar um agendamento de teste manualmente
# Ou verificar se o organization_id está correto
```

### Problema: Dados inválidos
```bash
# Verificar formato dos campos no Firestore
# Corrigir manualmente ou usar script de correção
```

## 📞 Informações para Suporte

Se precisar de ajuda, forneça:

1. ✅ Screenshots do console (últimas 50 linhas)
2. ✅ Screenshot do painel de diagnóstico
3. ✅ Screenshot da página /agenda
4. ✅ Valores de `organizationId`, `dataLength`, `validAppointments`
5. ✅ Número de appointments no Firestore (verificação manual)

---

**Tempo estimado:** 5-10 minutos
**Dificuldade:** Fácil
**Requer:** Acesso ao Firebase Console
