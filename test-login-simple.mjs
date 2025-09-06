import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ixevreqkdliucbsrqviy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXZyZXFrZGxpdWNic3Jxdml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODIzNzEsImV4cCI6MjA3MjM1ODM3MX0.GXN1qovqdFAjD9c4AJIhrsKBRl7pJb67CE2-6In48IA';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUsers = [
  { email: 'admin@fisioflow.com.br', password: 'senha123', name: 'Admin' },
  { email: 'joao@fisioflow.com.br', password: 'senha123', name: 'Fisioterapeuta' },
  { email: 'maria@fisioflow.com.br', password: 'senha123', name: 'Estagiário' },
  { email: 'ana@email.com', password: 'senha123', name: 'Paciente' },
  { email: 'carlos@parceiro.com', password: 'senha123', name: 'Parceiro' }
];

async function testLogin() {
  console.log('🔍 Testando conexão com Supabase...');
  
  // Testar conexão básica
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) {
      console.log('❌ Erro na conexão:', error.message);
    } else {
      console.log('✅ Conexão com Supabase OK');
    }
  } catch (err) {
    console.log('💥 Erro de conexão:', err.message);
  }
  
  console.log('\n🔐 Testando login dos usuários...');
  
  for (const user of testUsers) {
    console.log(`\n📧 Testando: ${user.name} (${user.email})`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (error) {
        console.log(`❌ Falha no login: ${error.message}`);
      } else {
        console.log(`✅ Login OK: ${data.user?.email}`);
        console.log(`   User ID: ${data.user?.id}`);
        console.log(`   Confirmado: ${data.user?.email_confirmed_at ? 'Sim' : 'Não'}`);
        
        // Fazer logout
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log(`💥 Exceção: ${err.message}`);
    }
  }
}

testLogin().catch(console.error);