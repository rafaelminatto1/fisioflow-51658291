# Solução: Cards de Agendamento Não Aparecem

## 🎯 Objetivo
Identificar e corrigir o problema dos cards de agendamento que não aparecem na página `/agenda`, tanto no ambiente local (porta 5173) quanto em produção.

## 📋 Documentos Criados

1. **DIAGNOSTIC_APPOINTMENTS_ISSUE.md** - Diagnóstico completo e detalhado
2. **QUICK_CHECK_APPOINTMENTS.md** - Guia rápido de verificação (5-10 min)
3. **scripts/browser-diagnostic.js** - Script de diagnóstico para executar no navegador
4. **scripts/diagnose-appointments-complete.cjs** - Script Node.js (requer credenciais Firebase)

## 🚀 Método Mais Rápido (Recomendado)

### Opção 1: Script no Navegador (Mais Fácil)

1. **Abra a aplicação:**
   ```bash
   npm run dev
   ```

2. **Navegue para:** http://localhost:5173/agenda

3. **Abra o Console:** Pressione F12 → Aba Console

4. **Execute o script:**
   - Abra o arquivo `scripts/browser-diagnostic.js`
   - Copie TODO o conteúdo
   - Cole no console do navegador
   - Pressione Enter

5. **Analise os resultados:**
   - O script mostrará todos os problemas encontrados
   - Os resultados serão copiados automaticamente para o clipboard
   - Cole os resultados aqui para análise

### Opção 2: Verificação Manual (5 minutos)

Siga o guia em **QUICK_CHECK_APPOINTMENTS.md**:

1. Abra http://localhost:5173/agenda
2. Abra o Console (F12)
3. Verifique os 5 checkpoints:
   - ✅ Checkpoint 1: Organization ID
   - ✅ Checkpoint 2: Query Iniciada
   - ✅ Checkpoint 3: Buscando Dados
   - ✅ Checkpoint 4: Resposta da API
   - ✅ Checkpoint 5: Processamento

4. Identifique qual checkpoint falhou
5. Siga a solução específica para aquele checkpoint

## 🔍 Problemas Conhecidos e Soluções

### Problema 1: Organization ID Vazio ❌

**Sintoma:**
```
[INFO] Schedule page - Organization ID
  { hasUser: true, organizationId: "", hasOrganizationId: false }
```

**Causa:** Cache do perfil do usuário desatualizado

**Solução:**
1. Clique no avatar/menu do usuário
2. Clique em "Sair"
3. Limpe o cache do navegador (Ctrl+Shift+Delete)
4. Faça login novamente
5. Navegue para `/agenda`

### Problema 2: Erro de CORS ❌

**Sintoma:**
```
Access to fetch at 'https://...' has been blocked by CORS
```

**Causa:** Cloud Functions bloqueando requisições do localhost

**Solução Automática:**
O sistema deve automaticamente usar o fallback para Firestore direto. Procure por:
```
[WARN] CORS error detected, falling back to direct Firestore access
```

**Se o fallback não ativar:**
Verifique se o arquivo `src/services/appointmentService.ts` tem o código de fallback implementado.

### Problema 3: Sem Dados no Firestore ⚠️

**Sintoma:**
```
[INFO] Appointments API response received
  { hasData: true, dataLength: 0 }
```

**Causa:** Não existem agendamentos para esta organização

**Solução:**
1. Verifique no Firebase Console se existem appointments
2. Verifique se o `organization_id` dos appointments corresponde ao do usuário
3. Crie agendamentos de teste se necessário

### Problema 4: Dados Inválidos ❌

**Sintoma:**
```
[INFO] Appointments processed successfully
  { validAppointments: 0, invalidAppointments: 5 }
```

**Causa:** Dados no Firestore em formato inválido

**Solução:**
1. Verifique os erros de validação no console
2. Corrija os campos no Firestore:
   - `patient_id`: UUID válido
   - `patient_name`: string não vazia
   - `date`: "YYYY-MM-DD" ou Timestamp
   - `start_time`: "HH:MM"
   - `status`: um dos valores válidos

### Problema 5: Regras de Segurança ❌

**Sintoma:**
```
FirebaseError: Missing or insufficient permissions
```

**Causa:** Regras de segurança do Firestore bloqueando acesso

**Solução:**
Verifique as regras de segurança no Firebase Console para a coleção `appointments`.

## 📊 Verificação em Produção

Para verificar em produção:

1. **Abra a URL de produção**
2. **Abra o Console (F12)**
3. **Execute o mesmo script de diagnóstico**
4. **Compare os resultados com o ambiente local**

**Diferenças esperadas:**
- URLs diferentes (localhost vs domínio de produção)
- Possíveis diferenças nas variáveis de ambiente
- CORS pode se comportar diferente

## 🛠️ Ferramentas de Diagnóstico

### 1. Painel de Diagnóstico Visual

O componente `ScheduleDiagnostics` aparece automaticamente no topo da página `/agenda` em modo desenvolvimento:

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

**Mostra:**
- Status da query (loading, success, error)
- Organization ID
- Número de appointments
- Dados de exemplo

### 2. Logs Detalhados

Os seguintes arquivos têm logs detalhados:
- `src/services/appointmentService.ts`
- `src/services/appointmentServiceDirect.ts`
- `src/hooks/useFilteredAppointments.ts`
- `src/pages/Schedule.tsx`

### 3. Script de Diagnóstico no Navegador

Execute `scripts/browser-diagnostic.js` no console para:
- Verificar React Query cache
- Verificar localStorage
- Testar conexão com Firestore
- Verificar elementos DOM
- Verificar requisições de rede

## 📝 Checklist de Verificação

Antes de reportar o problema, verifique:

- [ ] Servidor de desenvolvimento está rodando (`npm run dev`)
- [ ] Navegou para http://localhost:5173/agenda
- [ ] Fez login com usuário válido
- [ ] Abriu o console do navegador (F12)
- [ ] Verificou os logs no console
- [ ] Executou o script de diagnóstico
- [ ] Verificou o painel de diagnóstico visual
- [ ] Verificou o Firestore manualmente
- [ ] Tentou logout + login
- [ ] Limpou o cache do navegador

## 📞 Informações para Suporte

Se o problema persistir, forneça:

1. **Screenshots:**
   - Console do navegador (últimas 50 linhas)
   - Painel de diagnóstico
   - Página /agenda

2. **Logs:**
   - Copie e cole os logs do console
   - Resultado do script de diagnóstico

3. **Valores:**
   - `organizationId`: ?
   - `dataLength`: ?
   - `validAppointments`: ?
   - Número de appointments no Firestore: ?

4. **Ambiente:**
   - Local ou Produção?
   - URL: ?
   - Navegador: ?
   - Sistema Operacional: ?

## 🎯 Próximos Passos

1. **Execute o script de diagnóstico** (`scripts/browser-diagnostic.js`)
2. **Copie os resultados** (são copiados automaticamente para o clipboard)
3. **Cole os resultados aqui** para análise
4. **Siga as recomendações** específicas do diagnóstico

## 📚 Referências

- **DIAGNOSTIC_APPOINTMENTS_ISSUE.md** - Diagnóstico completo
- **QUICK_CHECK_APPOINTMENTS.md** - Guia rápido (5-10 min)
- **RESUMO_CORRECAO_AGENDAMENTOS.md** - Correções anteriores
- **DEBUG_APPOINTMENTS_NOT_SHOWING.md** - Debug anterior
- **APPOINTMENTS_FIX_SUMMARY.md** - Resumo de correções

## ⏱️ Tempo Estimado

- **Script de diagnóstico:** 2 minutos
- **Verificação manual:** 5-10 minutos
- **Correção (se necessário):** 5-15 minutos

## 🎉 Resultado Esperado

Após seguir estas instruções, você deve:

1. ✅ Identificar a causa exata do problema
2. ✅ Aplicar a solução específica
3. ✅ Ver os cards de agendamento aparecendo
4. ✅ Ter logs claros do que está acontecendo

---

**Última atualização:** 2026-02-19
**Versão:** 1.0
**Status:** Pronto para uso
