// Script para criar usuários de teste no Supabase Auth
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ycvbtjfrchcyvmkvuocu.supabase.co";
// Para criar usuários, precisamos da service_role key (não anon key)
// Se não tiver, o script tentará usar admin API
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada!');
  console.log('💡 Para criar usuários, você precisa da Service Role Key do Supabase.');
  console.log('   Configure: export SUPABASE_SERVICE_ROLE_KEY="sua-key-aqui"');
  console.log('   Ou adicione no .env: VITE_SUPABASE_SERVICE_ROLE_KEY="sua-key-aqui"');
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

async function createUser(userData) {
  console.log(`\n👤 Criando usuário: ${userData.name} (${userData.email})`);
  
  try {
    // Criar usuário via Admin API
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
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log(`⚠️  Usuário ${userData.email} já existe, buscando ID...`);
        // Buscar usuário existente
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === userData.email);
        if (existingUser) {
          return { userId: existingUser.id, email: existingUser.email, created: false };
        }
        throw new Error('Usuário existe mas não foi encontrado');
      }
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado');
    }

    console.log(`✅ Usuário criado: ${authData.user.id}`);
    return { userId: authData.user.id, email: authData.user.email, created: true };
  } catch (error) {
    console.error(`❌ Erro ao criar usuário ${userData.email}:`, error.message);
    throw error;
  }
}

async function createProfile(userId, email, role, organizationId) {
  console.log(`📝 Criando profile para ${email}...`);
  
  try {
    // Verificar se profile já existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      console.log(`⚠️  Profile já existe para ${email}, atualizando...`);
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: role,
          organization_id: organizationId,
          full_name: email.split('@')[0],
          email: email
        })
        .eq('user_id', userId);

      if (updateError) throw updateError;
      console.log(`✅ Profile atualizado`);
      return;
    }

    // Criar novo profile
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        email: email,
        full_name: email.split('@')[0],
        role: role,
        organization_id: organizationId,
        is_active: true
      });

    if (insertError) {
      // Se erro for de constraint única, tentar atualizar
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        console.log(`⚠️  Profile já existe, atualizando...`);
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: role,
            organization_id: organizationId,
            full_name: email.split('@')[0],
            email: email
          })
          .eq('user_id', userId);
        if (updateError) throw updateError;
        console.log(`✅ Profile atualizado`);
        return;
      }
      throw insertError;
    }

    console.log(`✅ Profile criado`);
  } catch (error) {
    console.error(`❌ Erro ao criar profile:`, error.message);
    throw error;
  }
}

async function getOrCreateTestOrganization() {
  console.log('\n🏢 Verificando organização de teste...');
  
  try {
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', 'activity-fisio-test')
      .limit(1);

    if (error) throw error;

    if (orgs && orgs.length > 0) {
      console.log(`✅ Organização encontrada: ${orgs[0].id}`);
      return orgs[0].id;
    }

    // Criar organização
    console.log('📝 Criando organização de teste...');
    const { data: newOrg, error: createError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Activity Fisio Test',
        slug: 'activity-fisio-test',
        active: true
      })
      .select('id')
      .single();

    if (createError) throw createError;

    console.log(`✅ Organização criada: ${newOrg.id}`);
    return newOrg.id;
  } catch (error) {
    console.error(`❌ Erro ao obter/criar organização:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Criando usuários de teste no Supabase Auth...\n');
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
        await createProfile(userId, email, userData.role, organizationId);
        results.push({ email, userId, created, success: true });
      } catch (error) {
        results.push({ email: userData.email, error: error.message, success: false });
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

    console.log(`✅ Usuários criados/atualizados: ${successful.length}`);
    successful.forEach(r => {
      console.log(`   - ${r.email} (${r.created ? 'criado' : 'já existia'})`);
    });

    if (failed.length > 0) {
      console.log(`\n❌ Falhas: ${failed.length}`);
      failed.forEach(r => {
        console.log(`   - ${r.email}: ${r.error}`);
      });
    }

    console.log('\n🏁 Processo concluído!\n');

    process.exit(failed.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  }
}

main();
