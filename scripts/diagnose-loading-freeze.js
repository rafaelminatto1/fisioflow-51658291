/**
 * Script de diagnóstico para identificar problemas de loading infinito
 * Execute no console do navegador quando a tela estiver travada
 */

console.log('=== DIAGNÓSTICO DE LOADING INFINITO ===\n');

// 1. Verificar estado do React Root
const rootElement = document.getElementById('root');
console.log('1. Root Element:', rootElement ? 'Encontrado' : 'NÃO ENCONTRADO');
console.log('   HTML:', rootElement?.innerHTML?.substring(0, 200));

// 2. Verificar se o loader inicial ainda está visível
const initialLoader = document.getElementById('initial-loader');
console.log('\n2. Initial Loader:', initialLoader ? 'AINDA VISÍVEL (PROBLEMA!)' : 'Removido (OK)');

// 3. Verificar erros no console
console.log('\n3. Verificando erros JavaScript...');
const errors = window.performance?.getEntriesByType?.('navigation') || [];
console.log('   Navigation Timing:', errors);

// 4. Verificar estado do Firebase Auth
console.log('\n4. Firebase Auth Status:');
try {
  const auth = window.firebase?.auth?.();
  console.log('   Auth Instance:', auth ? 'Inicializado' : 'NÃO INICIALIZADO');
  console.log('   Current User:', auth?.currentUser ? 'Autenticado' : 'Não autenticado');
} catch (e) {
  console.log('   Erro ao verificar Firebase:', e.message);
}

// 5. Verificar Network Requests pendentes
console.log('\n5. Network Requests:');
const resources = performance.getEntriesByType('resource');
const pendingRequests = resources.filter(r => r.duration === 0);
console.log('   Total Requests:', resources.length);
console.log('   Pending Requests:', pendingRequests.length);
if (pendingRequests.length > 0) {
  console.log('   Requests Pendentes:', pendingRequests.map(r => r.name));
}

// 6. Verificar IndexedDB
console.log('\n6. IndexedDB Status:');
indexedDB.databases().then(dbs => {
  console.log('   Databases:', dbs.map(db => db.name));
}).catch(e => {
  console.log('   Erro ao verificar IndexedDB:', e.message);
});

// 7. Verificar Service Worker
console.log('\n7. Service Worker:');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('   Registrations:', registrations.length);
    registrations.forEach(reg => {
      console.log('   - State:', reg.active?.state);
      console.log('   - Scope:', reg.scope);
    });
  });
} else {
  console.log('   Service Worker não suportado');
}

// 8. Verificar localStorage/sessionStorage
console.log('\n8. Storage:');
console.log('   localStorage items:', Object.keys(localStorage).length);
console.log('   sessionStorage items:', Object.keys(sessionStorage).length);
console.log('   app_version:', localStorage.getItem('app_version'));
console.log('   last_build_time:', localStorage.getItem('last_build_time'));

// 9. Verificar React Query Cache
console.log('\n9. React Query Cache:');
setTimeout(() => {
  const queryCache = window.__REACT_QUERY_DEVTOOLS_CACHE__;
  if (queryCache) {
    console.log('   Cache encontrado:', Object.keys(queryCache).length, 'queries');
  } else {
    console.log('   Cache não encontrado (pode estar OK)');
  }
}, 1000);

// 10. Verificar Firestore
console.log('\n10. Firestore Status:');
try {
  const db = window.firebase?.firestore?.();
  console.log('   Firestore Instance:', db ? 'Inicializado' : 'NÃO INICIALIZADO');
} catch (e) {
  console.log('   Erro ao verificar Firestore:', e.message);
}

console.log('\n=== FIM DO DIAGNÓSTICO ===');
console.log('\nPróximos passos:');
console.log('1. Se o Initial Loader ainda está visível, o React não está montando');
console.log('2. Verifique erros no console (tab Console)');
console.log('3. Verifique a tab Network para requests travados');
console.log('4. Tente limpar cache: localStorage.clear(); sessionStorage.clear(); location.reload();');
