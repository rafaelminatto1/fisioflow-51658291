# Guia Rápido: Sistema Travado no Loading

## 🚨 Problema
Sistema fica travado na tela branca com spinner e mensagem "Carregando... alongando a verdade um pouquinho."

## ✅ Soluções Rápidas (Tente nesta ordem)

### Solução 1: Limpar Cache do Navegador (Mais Comum)
```javascript
// Cole no Console do Navegador (F12 → Console):
localStorage.clear();
sessionStorage.clear();
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});
setTimeout(() => location.reload(), 1000);
```

### Solução 2: Forçar Logout
```javascript
// Cole no Console do Navegador:
localStorage.removeItem('firebase:authUser');
localStorage.removeItem('supabase.auth.token');
sessionStorage.clear();
location.reload();
```

### Solução 3: Remover Loader Manualmente
```javascript
// Cole no Console do Navegador:
const loader = document.getElementById('initial-loader');
if (loader) loader.remove();
```

### Solução 4: Verificar Conexão Firebase
```javascript
// Cole no Console do Navegador:
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID
});
```

## 🔍 Diagnóstico

### Execute o Script de Diagnóstico
```bash
# No terminal do projeto:
node scripts/diagnose-loading-freeze.js
```

Ou cole no console do navegador:
```javascript
// Diagnóstico rápido
console.log({
  'Initial Loader Visível': !!document.getElementById('initial-loader'),
  'React Montado': !!document.querySelector('[data-radix-portal]'),
  'LocalStorage Items': Object.keys(localStorage).length,
  'SessionStorage Items': Object.keys(sessionStorage).length,
  'Network Errors': performance.getEntriesByType('resource').filter(r => r.duration === 0).length
});
```

## 🛠️ Correções Aplicadas

### 1. Timeout de Segurança no AuthContextProvider
- Após 10 segundos, força a conclusão do loading
- Previne loops infinitos no fetchProfile
- Localização: `src/contexts/AuthContextProvider.tsx`

### 2. Remoção Automática do Initial Loader
- Loader HTML é removido após 2 segundos
- Fallback caso o React não remova automaticamente
- Localização: `src/App.tsx`

### 3. Limite de Tentativas no fetchProfile
- Reduzido de 5 para 3 tentativas
- Timeout de 1 segundo entre tentativas
- Fallback para Cloud SQL após falhas

## 📊 Monitoramento (Desenvolvimento)

### Ativar Diagnóstico Visual
Adicione temporariamente no `src/App.tsx`:

```typescript
import { LoadingDiagnostics } from '@/components/debug/LoadingDiagnostics';

// No render do App:
{import.meta.env.DEV && <LoadingDiagnostics />}
```

Isso mostrará um painel no canto inferior direito com:
- Tempo decorrido
- Estado do loading
- Presença do usuário/perfil
- Visibilidade do initial loader

## 🔧 Comandos Úteis

```bash
# Limpar build e reinstalar
rm -rf node_modules dist .vite
npm install
npm run dev

# Verificar variáveis de ambiente
cat .env | grep VITE_

# Testar build de produção
npm run build
npm run preview
```

## 📝 Logs para Verificar

Abra o Console (F12) e procure por:

✅ **Logs Esperados:**
```
[App] Aplicação iniciada
[AuthContextProvider] AuthContextProvider mounted
[App] Removendo initial loader
[App] Initial loader removido
```

❌ **Logs de Problema:**
```
[AuthContextProvider] Auth initialization timeout - forcing completion
[LoadingDiagnostics] LOADING TRAVADO POR MAIS DE 10 SEGUNDOS!
[AuthContextProvider] Error fetching profile
```

## 🚀 Próximos Passos se o Problema Persistir

1. **Verificar Firestore Rules**
   ```bash
   # Verificar se as regras permitem leitura de profiles
   firebase firestore:rules:get
   ```

2. **Verificar Conexão com Firebase**
   - Abra Network tab (F12)
   - Procure por requests para `firestore.googleapis.com`
   - Verifique se há erros 403 (permissão) ou 401 (auth)

3. **Testar com Usuário Novo**
   - Crie um novo usuário
   - Verifique se o problema persiste

4. **Verificar Service Worker**
   ```javascript
   // No console:
   navigator.serviceWorker.getRegistrations().then(regs => {
     regs.forEach(reg => reg.unregister());
     location.reload();
   });
   ```

## 📞 Suporte

Se nenhuma solução funcionar:

1. Capture screenshot do console (F12)
2. Capture screenshot da Network tab
3. Execute o diagnóstico completo:
   ```bash
   node scripts/diagnose-loading-freeze.js > diagnostico.txt
   ```
4. Compartilhe os arquivos para análise

## 🎯 Prevenção

Para evitar o problema no futuro:

1. **Sempre limpe o cache após updates**
   ```bash
   # Adicione ao seu workflow:
   npm run build && echo "Limpe o cache do navegador!"
   ```

2. **Use modo anônimo para testar**
   - Ctrl+Shift+N (Chrome)
   - Ctrl+Shift+P (Firefox)

3. **Monitore os logs em desenvolvimento**
   - Mantenha o console aberto
   - Observe warnings de timeout

4. **Teste com diferentes navegadores**
   - Chrome, Firefox, Safari
   - Verifique se o problema é específico do navegador
