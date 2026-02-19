/**
 * safe_production_migration.mjs
 * Script para corrigir perfis e Claims em produção sem perda de dados.
 */
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
  await readFile('./fisioflow-migration-firebase-adminsdk-fbsvc-34e95fa4de.json', 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

// ID da Organização Principal (Clínica Principal / Mooca)
const TARGET_ORG_ID = '11111111-1111-1111-1111-111111111111';

const isValidUuid = (id) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

async function migrateProduction() {
    console.log('--- INICIANDO MIGRAÇÃO DE PRODUÇÃO (MODO SEGURO) ---');
    
    // 1. Corrigir Perfis e Custom Claims
    const profilesSnap = await db.collection('profiles').get();
    console.log(`Analisando ${profilesSnap.size} perfis...`);

    for (const doc of profilesSnap.docs) {
        const data = doc.data();
        const uid = doc.id;
        
        // Verifica todos os campos possíveis de ID
        const currentOrgId = data.organizationId || data.organization_id || data.activeOrganizationId;
        const needsDbUpdate = !isValidUuid(currentOrgId);
        
        if (needsDbUpdate) {
            console.log(`[PERFIL] Usuário ${data.email || uid} com OrgID inválido: "${currentOrgId}". Corrigindo...`);
            
            // Atualiza Firestore com múltiplos campos para compatibilidade entre versões da API
            await doc.ref.update({
                organizationId: TARGET_ORG_ID,
                organization_id: TARGET_ORG_ID,
                activeOrganizationId: TARGET_ORG_ID,
                updated_at: new Date().toISOString()
            });
        }

        // Atualizar Custom Claims no Firebase Auth (Crucial para RLS no SQL)
        try {
            const user = await auth.getUser(uid);
            const claims = user.customClaims || {};
            
            // Se o claim não existe ou está diferente do alvo
            if (claims.organizationId !== TARGET_ORG_ID) {
                console.log(`[CLAIMS] Atualizando Claims para ${user.email}...`);
                await auth.setCustomUserClaims(uid, {
                    ...claims,
                    organizationId: TARGET_ORG_ID,
                    role: data.role || claims.role || 'professional'
                });
            }
        } catch (authErr) {
            console.error(`[AUTH] Erro ao processar UID ${uid}:`, authErr.message);
        }
    }

    // 2. Corrigir Pacientes Orfãos (IDs genéricos)
    const genericIds = ['default', 'org-default', ''];
    // Note: Firestore queries for 'null' specifically match null values, not missing fields.
    // We treat empty string same as generic ID here.
    
    for (const oldId of genericIds) {
        const orphanPatients = await db.collection('patients')
            .where('organizationId', '==', oldId)
            .get();
            
        if (!orphanPatients.empty) {
            console.log(`[PACIENTES] Corrigindo ${orphanPatients.size} pacientes com OrgID: "${oldId}"...`);
            const batch = db.batch();
            orphanPatients.docs.forEach(pDoc => {
                batch.update(pDoc.ref, { 
                    organizationId: TARGET_ORG_ID, 
                    organization_id: TARGET_ORG_ID 
                });
            });
            await batch.commit();
        }
    }

    // 3. Corrigir Agendamentos Orfãos
    // Using 'in' query for efficiency
    const orphanAppts = await db.collection('appointments')
        .where('organizationId', 'in', ['default', 'org-default'])
        .get();
        
    if (!orphanAppts.empty) {
        console.log(`[AGENDA] Corrigindo ${orphanAppts.size} agendamentos...`);
        const batch = db.batch();
        orphanAppts.docs.forEach(aDoc => {
            batch.update(aDoc.ref, { 
                organizationId: TARGET_ORG_ID, 
                organization_id: TARGET_ORG_ID 
            });
        });
        await batch.commit();
    }

    console.log('--- MIGRAÇÃO CONCLUÍDA COM SUCESSO ---');
}

migrateProduction().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
