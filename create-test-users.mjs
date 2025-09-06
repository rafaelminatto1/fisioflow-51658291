import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://ixevreqkdliucbsrqviy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4ZXZyZXFrZGxpdWNic3Jxdml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3ODIzNzEsImV4cCI6MjA3MjM1ODM3MX0.GXN1qovqdFAjD9c4AJIhrsKBRl7pJb67CE2-6In48IA';

const supabase = createClient(supabaseUrl, supabaseKey);

const testUsers = [
  {
    email: 'admin@fisioflow.com.br',
    password: 'senha123',
    full_name: 'Administrador Sistema',
    role: 'admin'
  },
  {
    email: 'joao@fisioflow.com.br',
    password: 'senha123',
    full_name: 'João Silva',
    role: 'fisioterapeuta'
  },
  {
    email: 'maria@fisioflow.com.br',
    password: 'senha123',
    full_name: 'Maria Santos',
    role: 'estagiario'
  },
  {
    email: 'ana@email.com',
    password: 'senha123',
    full_name: 'Ana Costa',
    role: 'paciente'
  },
  {
    email: 'carlos@parceiro.com',
    password: 'senha123',
    full_name: 'Carlos Oliveira',
    role: 'parceiro'
  }
];

async function testLogin() {
  console.log('🔍 Testando login dos usuários de teste...');
  
  for (const user of testUsers) {
    console.log(`\n📧 Testando login: ${user.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (error) {
        console.log(`❌ Erro no login: ${error.message}`);
        
        // Se o usuário não existe, vamos tentar criar
        if (error.message.includes('Invalid login credentials')) {
          console.log(`🔧 Tentando criar usuário: ${user.email}`);
          
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
              data: {
                full_name: user.full_name,
                role: user.role
              }
            }
          });
          
          if (signUpError) {
            console.log(`❌ Erro ao criar usuário: ${signUpError.message}`);
          } else {
            console.log(`✅ Usuário criado: ${user.email}`);
          }
        }
      } else {
        console.log(`✅ Login bem-sucedido: ${data.user?.email}`);
        
        // Fazer logout para testar o próximo usuário
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.log(`💥 Exceção: ${err.message}`);
    }
  }
}

testLogin().catch(console.error);