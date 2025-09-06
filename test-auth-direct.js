// Teste direto usando o cliente do projeto
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://ixevreqkdliucbsrqviy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXZyZXFrZGxpdWNic3Jxdml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODIzNzEsImV4cCI6MjA3MjM1ODM3MX0.GXN1qovqdFAjD9c4AJIhrsKBRl7pJb67CE2-6In48IA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const testUsers = [
  { email: 'admin@fisioflow.com.br', password: 'senha123', name: 'Admin' },
  { email: 'joao@fisioflow.com.br', password: 'senha123', name: 'Fisioterapeuta' },
  { email: 'maria@fisioflow.com.br', password: 'senha123', name: 'Estagiário' },
  { email: 'ana@email.com', password: 'senha123', name: 'Paciente' },
  { email: 'carlos@parceiro.com', password: 'senha123', name: 'Parceiro' }
];

async function testAuth() {
  console.log('🔍 Testando autenticação FisioFlow...');
  console.log('📡 URL:', SUPABASE_URL);
  console.log('🔑 Key:', SUPABASE_PUBLISHABLE_KEY.substring(0, 20) + '...');
  
  for (const user of testUsers) {
    console.log(`\n👤 Testando: ${user.name}`);
    console.log(`📧 Email: ${user.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (error) {
        console.log(`❌ Erro: ${error.message}`);
        if (error.message.includes('Invalid login credentials')) {
          console.log('   → Usuário não existe ou senha incorreta');
        }
      } else {
        console.log(`✅ Login bem-sucedido!`);
        console.log(`   → ID: ${data.user?.id}`);
        console.log(`   → Email: ${data.user?.email}`);
        console.log(`   → Confirmado: ${data.user?.email_confirmed_at ? 'Sim' : 'Não'}`);
        
        // Buscar perfil do usuário
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', data.user.id)
            .single();
            
          if (profileError) {
            console.log(`   → Perfil: Erro - ${profileError.message}`);
          } else {
            console.log(`   → Perfil: ${profile.full_name} (${profile.role})`);
          }
        } catch (profileErr) {
          console.log(`   → Perfil: Erro na consulta - ${profileErr.message}`);
        }
        
        // Fazer logout
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log(`💥 Exceção: ${err.message}`);
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🏁 Teste concluído!');
}

testAuth().catch(console.error);