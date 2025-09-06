// TESTE MANUAL - Execute este código no console do navegador
// 1. Abra http://localhost:8080/auth/login
// 2. Abra o console do navegador (F12)
// 3. Cole e execute este código

console.log('🔧 TESTE MANUAL DE LOGIN - INICIANDO...');

// Teste 1: Verificar se o Supabase está funcionando
async function testeSupabase() {
  try {
    console.log('📦 Importando Supabase...');
    const { supabase } = await import('/src/integrations/supabase/client.ts');
    console.log('✅ Supabase importado com sucesso');
    
    console.log('🔑 Testando login...');
    const result = await supabase.auth.signInWithPassword({
      email: 'joao@fisioflow.com.br',
      password: 'senha123'
    });
    
    console.log('📊 Resultado:', result);
    
    if (result.error) {
      console.error('❌ ERRO:', result.error.message);
      return false;
    } else {
      console.log('✅ LOGIN SUCESSO!');
      console.log('👤 Usuário:', result.data.user?.email);
      return true;
    }
  } catch (error) {
    console.error('💥 ERRO CRÍTICO:', error);
    return false;
  }
}

// Teste 2: Verificar elementos da página
function testeElementos() {
  console.log('🔍 Verificando elementos da página...');
  
  const email = document.querySelector('input[type="email"]');
  const password = document.querySelector('input[type="password"]');
  const button = document.querySelector('button[type="submit"]');
  
  console.log('📧 Campo email:', email ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');
  console.log('🔐 Campo senha:', password ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');
  console.log('🔘 Botão submit:', button ? '✅ ENCONTRADO' : '❌ NÃO ENCONTRADO');
  
  return email && password && button;
}

// Executar testes
console.log('🚀 EXECUTANDO TESTES...');
testeElementos();
testeSupabase();

console.log('📋 INSTRUÇÕES:');
console.log('1. Execute: testeSupabase() - para testar autenticação');
console.log('2. Execute: testeElementos() - para verificar formulário');
console.log('3. Preencha o formulário manualmente e clique em "Entrar"');