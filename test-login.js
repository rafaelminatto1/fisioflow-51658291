// Script para testar login automaticamente no console do navegador
// Cole este código no console da página de login e execute

(async function testLoginAutomatically() {
  console.log('🧪 === INICIANDO TESTE DE LOGIN AUTOMATIZADO ===');
  
  // Aguardar um pouco para garantir que a página carregou
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Credenciais do fisioterapeuta
  const credentials = {
    email: 'joao@fisioflow.com.br',
    password: 'senha123'
  };
  
  console.log('🔍 Procurando elementos do formulário...');
  
  // Encontrar elementos do formulário
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');
  const submitButton = document.querySelector('button[type="submit"]');
  
  if (!emailInput || !passwordInput || !submitButton) {
    console.error('❌ Elementos do formulário não encontrados:');
    console.log('Email input:', emailInput);
    console.log('Password input:', passwordInput);
    console.log('Submit button:', submitButton);
    return;
  }
  
  console.log('✅ Elementos encontrados!');
  console.log('📝 Preenchendo formulário com:', credentials.email);
  
  // Limpar campos primeiro
  emailInput.value = '';
  passwordInput.value = '';
  
  // Preencher email
  emailInput.focus();
  emailInput.value = credentials.email;
  emailInput.dispatchEvent(new Event('input', { bubbles: true }));
  emailInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Aguardar um pouco
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Preencher senha
  passwordInput.focus();
  passwordInput.value = credentials.password;
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
  
  console.log('🔐 Campos preenchidos. Valores atuais:');
  console.log('Email:', emailInput.value);
  console.log('Password:', passwordInput.value ? '***' : 'VAZIO');
  
  // Aguardar um pouco antes de submeter
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('🚀 Submetendo formulário...');
  
  // Interceptar logs do console
  const originalLog = console.log;
  const originalError = console.error;
  const logs = [];
  
  console.log = function(...args) {
    logs.push({ type: 'log', args });
    originalLog.apply(console, args);
  };
  
  console.error = function(...args) {
    logs.push({ type: 'error', args });
    originalError.apply(console, args);
  };
  
  // Submeter formulário
  submitButton.click();
  
  // Aguardar resposta
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Restaurar console
  console.log = originalLog;
  console.error = originalError;
  
  console.log('📊 === RESULTADO DO TESTE ===');
  console.log('URL atual:', window.location.href);
  console.log('Logs capturados:', logs);
  
  // Verificar se houve redirecionamento
  if (window.location.href.includes('/auth/login')) {
    console.log('❌ TESTE FALHOU - Ainda na página de login');
  } else {
    console.log('✅ TESTE PASSOU - Redirecionado para:', window.location.href);
  }
  
  console.log('🏁 === FIM DO TESTE ===');
})();

console.log('📋 Script de teste carregado. O teste será executado automaticamente em 2 segundos...');
setTimeout(() => {
  console.log('🎬 Executando teste...');
}, 2000);