// Script para testar conexão com Supabase
// Execute este script no console do navegador

(async function testSupabaseConnection() {
  console.log('🔗 Testando conexão com Supabase...');
  
  try {
    // Importar o cliente Supabase (assumindo que está disponível globalmente)
    // Se não estiver, você pode copiar as credenciais diretamente
    
    const SUPABASE_URL = "https://ixevreqkdliucbsrqviy.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXZyZXFrZGxpdWNic3Jxdml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODIzNzEsImV4cCI6MjA3MjM1ODM3MX0.GXN1qovqdFAjD9c4AJIhrsKBRl7pJb67CE2-6In48IA";
    
    // Criar cliente Supabase
    const { createClient } = supabase;
    const client = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    console.log('📊 Testando consulta à tabela profiles...');
    
    // Testar consulta simples
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, email, role')
      .limit(5);
    
    if (error) {
      console.error('❌ Erro na consulta:', error);
      return;
    }
    
    console.log('✅ Conexão com Supabase OK!');
    console.log('👥 Usuários encontrados:', data);
    
    // Testar login específico
    console.log('🔐 Testando login com fisioterapeuta...');
    
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: 'joao@fisioflow.com.br',
      password: 'senha123'
    });
    
    if (authError) {
      console.error('❌ Erro no login:', authError);
      return;
    }
    
    console.log('✅ Login bem-sucedido!');
    console.log('👤 Dados do usuário:', authData.user);
    console.log('🎫 Sessão:', authData.session);
    
    // Fazer logout
    await client.auth.signOut();
    console.log('🚪 Logout realizado');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
})();

console.log('📋 Script de teste Supabase carregado.')