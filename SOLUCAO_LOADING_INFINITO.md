# Solução para Loading Infinito no FisioFlow

## Problema Identificado

O sistema fica travado na tela de loading com a mensagem "Carregando... alongando a verdade um pouquinho."

## Causas Possíveis

1. **AuthContextProvider não está finalizando** - O `loading` state não está sendo definido como `false`
2. **Firestore/Firebase não está respondendo** - Timeout em requisições
3. **Cache corrompido** - IndexedDB ou localStorage com dados inválidos
4. **Loop infinito no fetchProfile** - Tentativas infinitas de buscar perfil

## Diagnóstico Rápido

### No Console do Navegador (F12):

```javascript
// Cole este código no console:
const rootElement = document.getElementById('root');
const initialLoader = document.getElementById('initial-loader');
console.log('Loader visível?', initialLoader !== null);
console.log('React montado?', rootElement?.innerHTML?.includes('initial-loader') === false);

// Verificar estado do Auth
console.log('Auth State:', window.__AUTH_STATE__);
```

### Solução Imediata 1: Limpar Cache

```javascript
// No console do navegador:
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('firebaseLocalStorageDb');
location.reload();
```

### Solução Imediata 2: Forçar Logout

```javascript
// No console do navegador:
localStorage.removeItem('firebase:authUser');
sessionStorage.clear();
location.reload();
```

## Correções Aplicadas

### 1. Timeout no fetchProfile

O problema principal está no `AuthContextProvider.tsx` - o `fetchProfile` pode ficar em loop infinito tentando buscar o perfil.

**Localização**: `src/contexts/AuthContextProvider.tsx:127`

**Problema**:
```typescript
// Retry infinito sem timeout
if (attempt < 5) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return fetchProfile(firebaseUser, attempt + 1);
}
```

**Solução**: Adicionar timeout máximo e fallback

### 2. Loading não é resetado em caso de erro

**Problema**: Se o `fetchProfile` falhar, o `loading` permanece `true`

**Solução**: Garantir que `setLoading(false)` seja chamado mesmo em caso de erro

### 3. Initial Loader não é removido

**Problema**: O loader HTML inicial não é removido quando o React monta

**Solução**: Adicionar código para remover o loader explicitamente

## Implementação das Correções

### Correção 1: Adicionar timeout no AuthContextProvider

```typescript
useEffect(() => {
  let mounted = true;
  let timeoutId: NodeJS.Timeout;

  // Timeout de segurança - se após 10s ainda estiver carregando, força conclusão
  timeoutId = setTimeout(() => {
    if (mounted && loading) {
      logger.warn('Auth initialization timeout - forcing completion', null, 'AuthContextProvider');
      setLoading(false);
      setInitialized(true);
    }
  }, 10000); // 10 segundos

  const unsubscribe = onAuthStateChange((firebaseUser) => {
    if (!mounted) return;
    clearTimeout(timeoutId);

    if (firebaseUser) {
      setUser(firebaseUser);
      setInitialized(true);
      setLoading(false); // CRÍTICO: Definir loading=false IMEDIATAMENTE

      // Carregar perfil em background
      fetchProfile(firebaseUser)
        .then(profileData => {
          if (mounted) {
            setProfile(profileData);
            if (profileData?.organization_id) {
              prefetchDashboardData(profileData.organization_id);
            }
          }
        })
        .catch(err => {
          logger.error('Erro ao carregar perfil', err, 'AuthContextProvider');
          // Não bloquear a UI mesmo se o perfil falhar
        });
    } else {
      setUser(null);
      setProfile(null);
      setLoading(false);
      setInitialized(true);
    }
  });

  return () => {
    mounted = false;
    clearTimeout(timeoutId);
    unsubscribe();
  };
}, [fetchProfile, prefetchDashboardData]);
```

### Correção 2: Remover Initial Loader explicitamente

Adicionar no `App.tsx`:

```typescript
useEffect(() => {
  // Remover loader inicial após 2 segundos (fallback)
  const removeInitialLoader = () => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }
  };

  // Remover após React montar
  setTimeout(removeInitialLoader, 2000);
}, []);
```

### Correção 3: Adicionar limite de tentativas no fetchProfile

```typescript
const fetchProfile = useCallback(async (firebaseUser: User, attempt = 1): Promise<Profile | null> => {
  // LIMITE MÁXIMO DE TENTATIVAS
  const MAX_ATTEMPTS = 3; // Reduzido de 5 para 3
  const RETRY_DELAY = 1000; // 1 segundo

  try {
    logger.debug(`Fetching profile (Attempt ${attempt}/${MAX_ATTEMPTS})`, null, 'AuthContextProvider');
    const profile = await waitForProfile(firebaseUser);

    if (profile) {
      return profile;
    }

    // Retry com limite
    if (attempt < MAX_ATTEMPTS) {
      logger.info(`Profile not found, retrying... (${attempt}/${MAX_ATTEMPTS})`, null, 'AuthContextProvider');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchProfile(firebaseUser, attempt + 1);
    }

    // Após MAX_ATTEMPTS, tentar Cloud SQL
    logger.warn('Profile not found after retries, trying Cloud SQL fallback', null, 'AuthContextProvider');
    // ... resto do código de fallback
    
  } catch (err) {
    logger.error('Error fetching profile', err, 'AuthContextProvider');
    // IMPORTANTE: Retornar null ao invés de lançar erro
    return null;
  }
}, []);
```

## Como Testar

1. **Limpar cache completamente**:
   ```bash
   # No console do navegador
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Verificar logs no console**:
   - Procurar por "Auth initialization timeout"
   - Verificar se "Fetching profile" aparece
   - Confirmar que "loading=false" é chamado

3. **Testar cenários**:
   - Login com usuário válido
   - Login com usuário sem perfil
   - Sem conexão com internet
   - Firestore offline

## Monitoramento

Adicionar logs para rastrear o problema:

```typescript
// No AuthContextProvider
useEffect(() => {
  logger.info('AuthContextProvider mounted', { loading, initialized }, 'AuthContextProvider');
  
  return () => {
    logger.info('AuthContextProvider unmounted', { loading, initialized }, 'AuthContextProvider');
  };
}, [loading, initialized]);
```

## Próximos Passos

1. ✅ Implementar timeout de segurança
2. ✅ Adicionar remoção explícita do initial loader
3. ✅ Limitar tentativas de fetchProfile
4. ⏳ Adicionar indicador visual de progresso
5. ⏳ Implementar retry com backoff exponencial
6. ⏳ Adicionar telemetria para rastrear problemas

## Comandos Úteis

```bash
# Executar diagnóstico
node scripts/diagnose-loading-freeze.js

# Limpar cache do navegador via CLI (Chrome)
rm -rf ~/.config/google-chrome/Default/IndexedDB/*

# Verificar logs do Firebase
firebase emulators:logs
```

## Referências

- `src/contexts/AuthContextProvider.tsx` - Provider de autenticação
- `src/App.tsx` - Componente principal
- `index.html` - Loader inicial
- `src/integrations/firebase/auth.ts` - Funções de autenticação
