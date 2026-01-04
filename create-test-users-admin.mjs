// Script para criar usuários de teste usando Supabase Admin API
// Este script garante que os usuários sejam criados com o formato correto de hash

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://ycvbtjfrchcyvmkvuocu.supabase.co";

// Tentar obter service role key de várias fontes
let SUPABASE_SERVICE_ROLE_KEY = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

// Tentar ler do .env se existir
try {
  const envPath = join(__dirname, '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const envMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (envMatch) {
    SUPABASE_SERVICE_ROLE_KEY = envMatch[1].trim().replace(/^["']|["']$/g, '');
  }
} catch (err) {
  // .env não existe ou não tem a key, continuar
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!\n');
  console.log('💡 Para criar usuários, você precisa da Service Role Key do Supabase.');
  console.log('\n📋 Como obter:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/ycvbtjfrchcyvmkvuocu/settings/api');
  console.log('   2. Role para baixo até "Project API keys"');
  console.log('   3. Copie a chave "service_role" (secret)\n');
  console.log('🔐 Configure a variável de ambiente:');
  console.log('   Windows PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY="sua-key-aqui"');
  console.log('   Windows CMD: set SUPABASE_SERVICE_ROLE_KEY=sua-key-aqui');
  console.log('   Linux/Mac: export SUPABASE_SERVICE_ROLE_KEY="sua-key-aqui"');
  console.log('   Ou adicione no .env: SUPABASE_SERVICE_ROLE_KEY="sua-key-aqui"\n');
  console.log('⚠️  ATENÇÃO: Nunca commite a service role key no código!\n');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  { email: 'admin@activityfisio.com', password: 'Admin@123', role: 'admin', name: 'Admin' },
  { email: 'fisio@activityfisio.com', password: 'Fisio@123', role: 'fisioterapeuta', name: 'Fisioterapeuta' },
  { email: 'estagiario@activityfisio.com', password: 'Estagiario@123', role: 'estagiario', name: 'Estagiário' },
];

async function deleteExistingUser(email) {
  try {
    // Buscar usuário existente
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.log(`   ⚠️  Erro ao listar usuários: ${listError.message}`);
      return null;
    }
    
    const existingUser = users?.users?.find(u => u.email === email);
    if (existingUser) {
      console.log(`   🗑️  Removendo usuário existente: ${existingUser.id}`);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
      if (deleteError) {
        console.log(`   ⚠️  Erro ao remover: ${deleteError.message}`);
        return existingUser.id;
      }
      console.log(`   ✅ Usuário removido`);
      return null;
    }
    return null;
  } catch (error) {
    console.log(`   ⚠️  Erro ao verificar usuário existente: ${error.message}`);
    return null;
  }
}

async function createUser(userData) {
  console.log(`\n👤 Processando: ${userData.name} (${userData.email})`);
  
  try {
    // Remover usuário existente se houver
    const existingUserId = await deleteExistingUser(userData.email);
    
    // Criar usuário via Admin API
    console.log(`   📝 Criando usuário via Admin API...`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        full_name: userData.name,
        role: userData.role
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado');
    }

    console.log(`   ✅ Usuário criado: ${authData.user.id}`);
    return { userId: authData.user.id, email: authData.user.email, created: true };
  } catch (error) {
    console.error(`   ❌ Erro ao criar usuário: ${error.message}`);
    throw error;
  }
}

async function createOrUpdateProfile(userId, email, role, organizationId) {
  console.log(`   📝 Criando/atualizando profile...`);
  
  try {
    // Verificar se profile já existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    const profileData = {
      user_id: userId,
      email: email,
      full_name: email.split('@')[0],
      role: role,
      organization_id: organizationId,
      is_active: true
    };

    if (existingProfile) {
      console.log(`   🔄 Atualizando profile existente...`);
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update(profileData)
        .eq('user_id', userId);

      if (updateError) throw updateError;
      console.log(`   ✅ Profile atualizado`);
    } else {
      console.log(`   ➕ Criando novo profile...`);
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert(profileData);

      if (insertError) throw insertError;
      console.log(`   ✅ Profile criado`);
    }
  } catch (error) {
    console.error(`   ❌ Erro ao criar/atualizar profile: ${error.message}`);
    throw error;
  }
}

async function getOrCreateTestOrganization() {
  console.log('\n🏢 Verificando organização de teste...');
  
  try {
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('slug', 'activity-fisio-test')
      .limit(1);

    if (error) throw error;

    if (orgs && orgs.length > 0) {
      console.log(`   ✅ Organização encontrada: ${orgs[0].name} (${orgs[0].id})`);
      return orgs[0].id;
    }

    // Criar organização
    console.log('   📝 Criando organização de teste...');
    const { data: newOrg, error: createError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Activity Fisio Test',
        slug: 'activity-fisio-test',
        active: true
      })
      .select('id, name')
      .single();

    if (createError) throw createError;

    console.log(`   ✅ Organização criada: ${newOrg.name} (${newOrg.id})`);
    return newOrg.id;
  } catch (error) {
    console.error(`   ❌ Erro ao obter/criar organização: ${error.message}`);
    throw error;
  }
}

async function testLogin(email, password) {
  console.log(`   🧪 Testando login...`);
  
  try {
    // Criar cliente com anon key para teste
    const { createClient } = await import('@supabase/supabase-js');
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljdmJ0amZyY2hjeXZta3Z1b2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTA5OTQsImV4cCI6MjA3NTE2Njk5NH0.L5maWG2hc3LVHEUMOzfTRTjYwIAJFXx3zan3G-Y1zAA";
    const supabaseTest = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data, error } = await supabaseTest.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.log(`   ❌ Login falhou: ${error.message}`);
      return false;
    }
    
    if (data?.user) {
      console.log(`   ✅ Login bem-sucedido! User ID: ${data.user.id}`);
      await supabaseTest.auth.signOut();
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`   ❌ Erro no teste de login: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Criando usuários de teste usando Supabase Admin API...\n');
  console.log('📡 URL:', SUPABASE_URL);
  console.log('🔑 Service Role Key:', SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...\n');

  try {
    // Obter ou criar organização
    const organizationId = await getOrCreateTestOrganization();

    const results = [];

    // Criar cada usuário
    for (const userData of testUsers) {
      try {
        const { userId, email, created } = await createUser(userData);
        await createOrUpdateProfile(userId, email, userData.role, organizationId);
        
        // Testar login
        const loginSuccess = await testLogin(email, userData.password);
        
        results.push({ 
          email, 
          userId, 
          created, 
          loginSuccess,
          success: true 
        });
      } catch (error) {
        results.push({ 
          email: userData.email, 
          error: error.message, 
          success: false 
        });
      }
      // Pequena pausa entre criações
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Resumo
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const loginFailed = results.filter(r => r.success && !r.loginSuccess);

    console.log(`✅ Usuários criados/atualizados: ${successful.length}`);
    successful.forEach(r => {
      const loginStatus = r.loginSuccess ? '✅' : '❌';
      console.log(`   ${loginStatus} ${r.email} (${r.created ? 'criado' : 'atualizado'}) - Login: ${r.loginSuccess ? 'OK' : 'FALHOU'}`);
      console.log(`      User ID: ${r.userId}`);
    });

    if (loginFailed.length > 0) {
      console.log(`\n⚠️  Usuários criados mas login falhou: ${loginFailed.length}`);
      loginFailed.forEach(r => {
        console.log(`   - ${r.email}: Login não funcionou`);
      });
    }

    if (failed.length > 0) {
      console.log(`\n❌ Falhas: ${failed.length}`);
      failed.forEach(r => {
        console.log(`   - ${r.email}: ${r.error}`);
      });
    }

    console.log('\n🏁 Processo concluído!\n');

    // Salvar resultados em arquivo
    const fs = await import('fs');
    const resultsJson = {
      timestamp: new Date().toISOString(),
      organizationId,
      users: results.map(r => ({
        email: r.email,
        userId: r.userId,
        loginSuccess: r.loginSuccess,
        success: r.success
      }))
    };
    
    fs.writeFileSync(
      'usuarios-criados-admin-api.json',
      JSON.stringify(resultsJson, null, 2)
    );
    console.log('💾 Resultados salvos em: usuarios-criados-admin-api.json\n');

    process.exit(failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  }
}

main();

