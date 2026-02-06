

// Load environment variables

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessários.');
    console.error('Certifique-se de ter um arquivo .env com essas variáveis para testes de RLS.');
    process.exit(1);
}

// Clients
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runRLSTets() {
    console.log('🔒 Iniciando Testes de RLS (Row Level Security)...');

    const suffix = Math.floor(Math.random() * 10000);
    const orgName = `RLS Test Org ${suffix}`;
    const therapistEmail = `rls.therapist.${suffix}@test.com`;
    const patientEmail = `rls.patient.${suffix}@test.com`;
    const password = 'test-password-123';

    let therapistId: string | null = null;
    let patientId: string | null = null;
    let orgId: string | null = null;

    try {
        // 1. Setup Data (Therapist, Org, Patient)
        console.log('\n--- 1. Setup de Dados ---');

        // Create Therapist User
        const { data: user1, error: err1 } = await adminClient.auth.admin.createUser({
            email: therapistEmail,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'RLS Therapist' }
        });
        if (err1) throw err1;
        therapistId = user1.user.id;
        console.log(`✅ Terapeuta criado: ${therapistId}`);

        // Create Organization
        const { data: org, error: errOrg } = await adminClient
            .from('organizations')
            .insert({ name: orgName, slug: `rls-org-${suffix}`, active: true })
            .select()
            .single();
        if (errOrg) throw errOrg;
        orgId = org.id;
        console.log(`✅ Organização criada: ${orgId}`);

        // Link Therapist to Org (Profile update) - Trigger handles profile creation, but we need to update org/role
        // Initial profile created by trigger might have role 'paciente'.
        const { error: errProf1 } = await adminClient
            .from('profiles')
            .update({ role: 'fisioterapeuta', organization_id: orgId })
            .eq('user_id', therapistId);
        if (errProf1) throw errProf1;
        console.log('✅ Perfil do terapeuta atualizado');

        // Create Patient User
        const { data: user2, error: err2 } = await adminClient.auth.admin.createUser({
            email: patientEmail,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'RLS Patient' }
        });
        if (err2) throw err2;
        patientId = user2.user.id;
        console.log(`✅ Paciente criado: ${patientId}`);

        // Update Patient Profile
        const { error: errProf2 } = await adminClient
            .from('profiles')
            .update({ role: 'paciente', organization_id: orgId }) // Assign to same org
            .eq('user_id', patientId);
        if (errProf2) throw errProf2;

        // Create Patient Record in 'patients' table
        const { error: errPat } = await adminClient
            .from('patients')
            .insert({
                full_name: 'Patient RLS',
                email: patientEmail,
                profile_id: (await adminClient.from('profiles').select('id').eq('user_id', patientId).single()).data?.id,
                organization_id: orgId
            });
        if (errPat) throw errPat;
        console.log('✅ Registro de paciente criado');


        // 2. Test: Therapist can read Patient
        console.log('\n--- 2. Teste: Acesso do Terapeuta ---');
        const { data: { session: therapistSession } } = await adminClient.auth.signInWithPassword({ email: therapistEmail, password });
        const therapistClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${therapistSession?.access_token}` } }
        });

        const { data: tPats, error: tErr } = await therapistClient.from('patients').select('*');
        if (tErr) throw tErr;

        if (tPats.length > 0) {
            console.log(`✅ Terapeuta vê ${tPats.length} pacientes (ESPERADO)`);
        } else {
            console.error('❌ Terapeuta NÃO viu pacientes (ERRO - Deveria ver)');
        }


        // 3. Test: Patient can read OWN data
        console.log('\n--- 3. Teste: Acesso do Paciente (Própróprios dados) ---');
        const { data: { session: patientSession } } = await adminClient.auth.signInWithPassword({ email: patientEmail, password });
        const patientClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${patientSession?.access_token}` } }
        });

        const { data: pData, error: pErr } = await patientClient.from('profiles').select('*').eq('user_id', patientId);
        if (pData && pData.length === 1) {
            console.log('✅ Paciente vê seu próprio perfil (ESPERADO)');
        } else {
            console.error('❌ Paciente falhou ao ver próprio perfil:', pErr);
        }


        // 4. Test: Patient can NOT read other patients (or random data)
        console.log('\n--- 4. Teste: Isolamento do Paciente ---');
        const { data: allProfiles } = await patientClient.from('profiles').select('*');

        // Should verify query logic. RLS often filters silently.
        if (allProfiles && allProfiles.length === 1 && allProfiles[0].user_id === patientId) {
            console.log('✅ Paciente só vê 1 perfil (ele mesmo) (ESPERADO)');
        } else {
            console.warn(`⚠️ Paciente viu ${allProfiles?.length} perfis. Verifique se RLS está vazando dados.`);
            if (allProfiles && allProfiles.length > 1) console.log('IDs vistos:', allProfiles.map(p => p.id));
        }

    } catch (error) {
        console.error('❌ FALHA NO TESTE:', error);
    } finally {
        // Cleanup
        console.log('\n--- Limpeza ---');
        if (therapistId) await adminClient.auth.admin.deleteUser(therapistId);
        if (patientId) await adminClient.auth.admin.deleteUser(patientId);
        // Org delete might fail due to FKs but good to try or cascade
        if (orgId) await adminClient.from('organizations').delete().eq('id', orgId);
        console.log('🧹 Limpeza concluída');
    }
}

runRLSTets();
