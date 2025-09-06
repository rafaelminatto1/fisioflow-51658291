// TESTE DIRETO - Cole este código no console do navegador
// Na página: http://localhost:8080/auth/login

(async function() {
  console.log('🔧 === TESTE DE AUTENTICAÇÃO INICIADO ===');
  
  try {
    // 1. Verificar se estamos na página correta
    console.log('🌐 URL atual:', window.location.href);
    
    // 2. Importar cliente Supabase
    console.log('📦 Importando cliente Supabase...');
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    console.log('✅ Cliente Supabase carregado');
    
    // 3. Verificar estado atual
    console.log('🔍 Verificando estado atual...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('📊 Sessão atual:', session ? 'ATIVA' : 'INATIVA');
    if (sessionError) console.log('⚠️ Erro na sessão:', sessionError);
    
    // 4. Testar login direto
    console.log('🔑 Testando login direto...');
    console.log('📧 Email: joao@fisioflow.com.br');
    console.log('🔐 Password: senha123');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'joao@fisioflow.com.br',
      password: 'senha123'
    });
    
    console.log('📊 === RESULTADO DO LOGIN ===');
    console.log('✅ Data:', data);
    console.log('❌ Error:', error);
    
    if (error) {
      console.error('💥 ERRO NO LOGIN:', error.message);
      console.error('🔍 Detalhes do erro:', error);
    } else {
      console.log('🎉 LOGIN BEM-SUCEDIDO!');
      console.log('👤 Usuário:', data.user?.email);
      console.log('🎫 Sessão:', data.session ? 'CRIADA' : 'NÃO CRIADA');
      console.log('🔑 Access Token:', data.session?.access_token ? 'PRESENTE' : 'AUSENTE');
    }
    
    // 5. Verificar estado após login
    console.log('🔄 Verificando estado após login...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { data: { session: newSession }, error: newSessionError } = await supabase.auth.getSession();
    console.log('📊 Nova sessão:', newSession ? 'ATIVA' : 'INATIVA');
    if (newSession) {
      console.log('👤 Usuário logado:', newSession.user.email);
      console.log('⏰ Expira em:', new Date(newSession.expires_at * 1000));
    }
    
    // 6. Testar formulário da página
    console.log('📝 === TESTANDO FORMULÁRIO DA PÁGINA ===');
    
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.querySelector('input[type="password"]');
    const submitButton = document.querySelector('button[type="submit"]');
    
    if (emailInput && passwordInput && submitButton) {
      console.log('✅ Elementos do formulário encontrados');
      
      // Limpar campos primeiro
      emailInput.value = '';
      passwordInput.value = '';
      
      // Preencher campos
      emailInput.value = 'joao@fisioflow.com.br';
      passwordInput.value = 'senha123';
      
      // Disparar eventos
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('📝 Campos preenchidos');
      console.log('📧 Email no campo:', emailInput.value);
      console.log('🔐 Password no campo:', passwordInput.value ? '***' : 'VAZIO');
      
      console.log('🖱️ Clicando no botão de submit em 2 segundos...');
      
      setTimeout(() => {
        console.log('🚀 Enviando formulário...');
        submitButton.click();
        
        // Verificar resultado após 3 segundos
        setTimeout(() => {
          console.log('🔍 Verificando resultado do formulário...');
          console.log('🌐 URL atual:', window.location.href);
          
          if (window.location.href.includes('/auth/login')) {
            console.log('❌ Ainda na página de login - possível erro no formulário');
          } else {
            console.log('✅ Redirecionado - formulário funcionou!');
          }
          
          console.log('🏁 === TESTE CONCLUÍDO ===');
        }, 3000);
      }, 2000);
      
    } else {
      console.error('❌ Elementos do formulário não encontrados');
      console.log('📧 Email input:', emailInput);
      console.log('🔐 Password input:', passwordInput);
      console.log('🔘 Submit button:', submitButton);
    }
    
  } catch (error) {
    console.error('💥 ERRO DURANTE TESTE:', error);
    console.error('🔍 Stack trace:', error.stack);
  }
})();

console.log('📋 Script carregado! O teste será executado automaticamente.');