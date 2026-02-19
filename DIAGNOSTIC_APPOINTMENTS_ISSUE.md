# Diagnóstico: Cards de Agendamento Não Aparecem

## Problema Reportado
Os cards de agendamento não estão aparecendo na página `/agenda`, tanto no ambiente local (porta 5173) quanto em produção.

## Histórico de Correções Anteriores

Baseado nos documentos existentes, já foram feitas várias tentativas de correção:

### 1. Problema de Organization ID ✅ (Corrigido anteriormente)
- **Causa**: Usuário não tinha `organization_id` no perfil do Firestore
- **Solução**: Adicionado manualmente via Firebase Console
- **Valor**: `edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82`

### 2. Problema de CORS ✅ (Contornado)
- **Causa**: Cloud Functions bloqueando requisições do localhost
- **Solução**: Implementado fallback automático para Firestore direto
- **Arquivo**: `src/services/appointmentServiceDirect.ts`

### 3. Índice do Firestore ⏳ (Pendente)
- **Causa**: Query no Firestore requer índice composto
- **Solução Temporária**: Removido `orderBy` e ordenação feita em memória

## Checklist de Diagnóstico

### Passo 1: Verificar Console do Navegador

Abra o DevTools (F12) e procure por:

#### ✅ Logs Esperados (Sucesso):
```
[INFO] Schedule page - Organization ID
  { hasUser: true, organizationId: "edc6dd27-...", hasOrganizationId: true }

[INFO] useFilteredAppointments query
  { organizationId: "edc6dd27-...", viewType: "week", enabled: true }

[INFO] Fetching appointments
  { organizationId: "edc6dd27-...", limit: 3000 }

[INFO] Appointments API response received
  { hasData: true, dataLength: X }

[INFO] Appointments processed successfully
  { validAppointments: X }
```

#### ❌ Problemas Comuns:

**A. Organization ID Faltando:**
```
[INFO] Schedule page - Organization ID
  { hasUser: true, organizationId: "", hasOrganizationId: false }
```
**Solução**: Fazer logout e login novamente para recarregar o perfil.

**B. Erro de CORS:**
```
Access to fetch at 'https://...' from origin 'http://localhost:5173' has been blocked by CORS
```
**Solução**: O fallback para Firestore direto deve ativar automaticamente. Procure por:
```
[WARN] CORS error detected, falling back to direct Firestore access
```

**C. Erro de Permissão:**
```
FirebaseError: Missing or insufficient permissions
```
**Solução**: Verificar regras de segurança do Firestore.

**D. Nenhum Dado Retornado:**
```
[INFO] Appointments API response received
  { hasData: true, dataLength: 0 }
```
**Solução**: Não existem agendamentos para esta organização/período.

### Passo 2: Verificar Componente de Diagnóstico

O componente `ScheduleDiagnostics` deve aparecer no topo da página em modo desenvolvimento:

```tsx
{import.meta.env.DEV && (
  <div className="px-4 pt-4">
    <ScheduleDiagnostics 
      currentDate={currentDate} 
      viewType={viewType as 'day' | 'week' | 'month'} 
    />
  </div>
)}
```

**O que verificar:**
- ✅ Organization ID está definido?
- ✅ Status da query (loading, success, error)?
- ✅ Número de appointments carregados?
- ✅ Dados de exemplo do primeiro appointment?

### Passo 3: Verificar Firestore Diretamente

1. Abra o Firebase Console: https://console.firebase.google.com/
2. Vá para Firestore Database
3. Navegue até a coleção `appointments`
4. Verifique:
   - ✅ Existem documentos na coleção?
   - ✅ Os documentos têm o campo `organization_id`?
   - ✅ O `organization_id` corresponde ao do usuário?
   - ✅ Os campos obrigatórios estão presentes? (`patient_id`, `patient_name`, `date`, `start_time`)

### Passo 4: Verificar Perfil do Usuário

1. No Firebase Console, vá para a coleção `profiles`
2. Procure pelo documento do usuário (email: `rafael.minatto@yahoo.com.br`)
3. Verifique:
   - ✅ Campo `organization_id` existe?
   - ✅ Valor é um UUID válido?
   - ✅ Corresponde ao `organization_id` dos appointments?

## Comandos de Diagnóstico

### Verificar Logs em Tempo Real

No navegador, abra o console e execute:

```javascript
// Verificar se há appointments no estado
console.log('Appointments:', window.__REACT_DEVTOOLS_GLOBAL_HOOK__);

// Verificar localStorage
console.log('Auth:', localStorage.getItem('auth'));
console.log('User:', localStorage.getItem('user'));
```

### Forçar Reload do Perfil

1. Fazer logout da aplicação
2. Limpar cache do navegador (Ctrl+Shift+Delete)
3. Fazer login novamente
4. Navegar para `/agenda`

### Testar Firestore Direto

Abra o console do navegador na página `/agenda` e execute:

```javascript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';

const organizationId = 'edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82';
const appointmentsRef = collection(db, 'appointments');
const q = query(appointmentsRef, where('organization_id', '==', organizationId));
const snapshot = await getDocs(q);

console.log('Appointments found:', snapshot.size);
snapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

## Possíveis Causas do Problema Atual

### 1. Cache do Perfil Desatualizado
**Sintoma**: Organization ID ainda está vazio no estado da aplicação
**Solução**: Logout + Login

### 2. Regras de Segurança do Firestore
**Sintoma**: Erro de permissão no console
**Solução**: Verificar e atualizar regras de segurança

### 3. Dados Corrompidos
**Sintoma**: Appointments existem mas não passam na validação
**Solução**: Verificar formato dos dados no Firestore

### 4. Problema de Rede/CORS
**Sintoma**: Requisições bloqueadas
**Solução**: Verificar se o fallback para Firestore direto está funcionando

### 5. Filtros Ativos
**Sintoma**: Appointments carregam mas não aparecem
**Solução**: Limpar filtros na interface

### 6. Problema de Renderização
**Sintoma**: Dados carregam mas componentes não renderizam
**Solução**: Verificar erros no console do React

## Próximos Passos

### Imediato (Faça Agora):

1. **Abra a aplicação em http://localhost:5173**
2. **Abra o DevTools (F12) → Console**
3. **Navegue para `/agenda`**
4. **Tire screenshots de:**
   - Painel de diagnóstico (se aparecer)
   - Console completo (últimas 50 linhas)
   - Página da agenda (mostrando que os cards não aparecem)

5. **Verifique especificamente:**
   - Qual é o valor de `organizationId` nos logs?
   - Há algum erro em vermelho no console?
   - O componente `ScheduleDiagnostics` aparece?
   - Quantos appointments o diagnóstico mostra?

### Se Organization ID Estiver Vazio:

```bash
# 1. Fazer logout da aplicação
# 2. Limpar cache do navegador
# 3. Fazer login novamente
# 4. Verificar novamente
```

### Se Organization ID Estiver Correto mas Sem Dados:

```bash
# Verificar se existem appointments no Firestore
# para este organization_id específico
```

### Se Houver Erro de CORS:

```bash
# Verificar se o fallback está ativando:
# Procurar por: "[WARN] CORS error detected, falling back to direct Firestore access"
```

### Se Dados Carregarem mas Não Renderizarem:

```bash
# Verificar erros de renderização no console
# Verificar se há erros no componente CalendarView
# Verificar se os filtros estão bloqueando a exibição
```

## Arquivos Relevantes

### Serviços:
- `src/services/appointmentService.ts` - Serviço principal com fallback
- `src/services/appointmentServiceDirect.ts` - Acesso direto ao Firestore

### Hooks:
- `src/hooks/useFilteredAppointments.ts` - Hook de filtragem
- `src/hooks/useAppointmentsByPeriod.ts` - Hook de carregamento por período

### Componentes:
- `src/pages/Schedule.tsx` - Página principal
- `src/components/schedule/ScheduleDiagnostics.tsx` - Componente de diagnóstico
- `src/components/schedule/CalendarView.tsx` - Visualização do calendário

### Scripts:
- `scripts/diagnose-appointments-complete.cjs` - Script de diagnóstico completo
- `scripts/fix-organization-id.js` - Script para corrigir organization_id

## Informações de Contato

Após executar os passos acima, forneça:

1. **Screenshots** do console e da página
2. **Logs** completos do console (copiar e colar)
3. **Valor** do `organizationId` nos logs
4. **Número** de appointments que o diagnóstico mostra
5. **Erros** específicos (se houver)

Com essas informações, será possível identificar a causa exata do problema.

## Status Atual

- ✅ Organization ID foi corrigido anteriormente
- ✅ Fallback para Firestore direto implementado
- ✅ Componente de diagnóstico adicionado
- ⏳ Aguardando verificação do usuário
- ⏳ Aguardando logs do console
- ⏳ Aguardando screenshots

## Ambiente

- **Local**: http://localhost:5173
- **Produção**: [URL da produção]
- **Firebase Project**: fisioflow-migration
- **Organization ID**: edc6dd27-f4e4-4bb4-bd81-1b43bbd04c82
- **User Email**: rafael.minatto@yahoo.com.br
