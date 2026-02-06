// Teste simples de login

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ycvbtjfrchcyvmkvuocu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const testUsers = [
  { email: 'admin@activityfisio.com', password: 'Admin@123', name: 'Admin' },
  { email: 'fisio@activityfisio.com', password: 'Fisio@123', name: 'Fisio' },
  { email: 'estagiario@activityfisio.com', password: 'Estagiario@123', name: 'Estagiário' },
];

async function testLogin() {
  console.log('🧪 Testando login dos usuários...\n');
  
  for (const user of testUsers) {
    console.log(`\n👤 Testando: ${user.name} (${user.email})`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      
      if (error) {
        console.log(`❌ Erro: ${error.message}`);
        console.log(`   Código: ${error.status || 'N/A'}`);
        if (error.message.includes('Invalid login credentials')) {
          console.log(`   ⚠️  Credenciais inválidas - pode ser problema com hash da senha`);
        }
      } else if (data?.user) {
        console.log(`✅ Login bem-sucedido!`);
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Email: ${data.user.email}`);
        
        // Verificar profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();
        
        if (profileError) {
          console.log(`   ⚠️  Erro ao buscar profile: ${profileError.message}`);
        } else if (profile) {
          console.log(`   ✅ Profile encontrado:`);
          console.log(`      - Nome: ${profile.full_name || 'N/A'}`);
          console.log(`      - Role: ${profile.role || 'N/A'}`);
          console.log(`      - Organization ID: ${profile.organization_id || 'N/A'}`);
        }
        
        // Fazer logout
        await supabase.auth.signOut();
      } else {
        console.log(`❌ Login retornou sem dados`);
      }
    } catch (err) {
      console.log(`❌ Exceção: ${err.message}`);
      console.log(`   Stack: ${err.stack}`);
    }
  }
  
  console.log('\n🏁 Teste concluído!\n');
}

testLogin().catch(console.error);
