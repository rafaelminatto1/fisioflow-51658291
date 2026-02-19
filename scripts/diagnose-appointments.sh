#!/bin/bash

# Script para diagnosticar problemas com agendamentos usando Firebase CLI
# Uso: bash scripts/diagnose-appointments.sh

set -e

echo "🔍 Diagnóstico de Agendamentos - FisioFlow"
echo "=========================================="
echo ""

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não está instalado!"
    echo "   Instale com: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI encontrado"
echo ""

# Verificar projeto atual
echo "📋 Projeto Firebase atual:"
firebase projects:list | grep "current" || echo "Nenhum projeto selecionado"
echo ""

# Solicitar email do usuário
read -p "📧 Digite o email do usuário para diagnosticar: " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
    echo "❌ Email não pode estar vazio!"
    exit 1
fi

echo ""
echo "🔎 Buscando informações do usuário..."
echo ""

# Criar script temporário para executar via Firebase Functions
cat > /tmp/diagnose-user.js << 'EOF'
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

async function diagnose(email) {
  try {
    // Buscar usuário
    const userRecord = await auth.getUserByEmail(email);
    console.log('✅ Usuário encontrado:');
    console.log(`   UID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Nome: ${userRecord.displayName || 'N/A'}`);
    console.log('');
    
    // Buscar perfil
    const profileDoc = await db.collection('profiles').doc(userRecord.uid).get();
    
    if (!profileDoc.exists) {
      console.log('❌ Perfil não encontrado no Firestore!');
      return;
    }
    
    const profile = profileDoc.data();
    console.log('✅ Perfil encontrado:');
    console.log(`   Nome: ${profile.full_name || 'N/A'}`);
    console.log(`   Role: ${profile.role || 'N/A'}`);
    console.log(`   Organization ID: ${profile.organization_id || '❌ NÃO DEFINIDO'}`);
    console.log('');
    
    if (!profile.organization_id) {
      console.log('⚠️  PROBLEMA IDENTIFICADO: Organization ID não está definido!');
      console.log('');
      console.log('📋 Organizações disponíveis:');
      
      const orgsSnapshot = await db.collection('organizations').limit(5).get();
      if (orgsSnapshot.empty) {
        console.log('   ❌ Nenhuma organização encontrada!');
      } else {
        orgsSnapshot.forEach((doc, index) => {
          const org = doc.data();
          console.log(`   ${index + 1}. ${org.name || 'Sem nome'} (ID: ${doc.id})`);
        });
      }
      console.log('');
      console.log('💡 Solução: Execute o script de correção para associar o usuário a uma organização.');
      return;
    }
    
    // Verificar agendamentos
    console.log('🔎 Verificando agendamentos...');
    const appointmentsSnapshot = await db.collection('appointments')
      .where('organization_id', '==', profile.organization_id)
      .limit(10)
      .get();
    
    console.log(`📊 Total de agendamentos encontrados: ${appointmentsSnapshot.size}`);
    console.log('');
    
    if (appointmentsSnapshot.size > 0) {
      console.log('📋 Primeiros agendamentos:');
      appointmentsSnapshot.forEach((doc, index) => {
        const apt = doc.data();
        console.log(`   ${index + 1}. ID: ${doc.id}`);
        console.log(`      Paciente: ${apt.patient_name || apt.patientName || 'N/A'}`);
        console.log(`      Data: ${apt.date || apt.appointment_date || 'N/A'}`);
        console.log(`      Hora: ${apt.start_time || apt.appointment_time || 'N/A'}`);
        console.log(`      Status: ${apt.status || 'N/A'}`);
        
        // Verificar campos obrigatórios
        const missingFields = [];
        if (!apt.patient_id) missingFields.push('patient_id');
        if (!apt.date && !apt.appointment_date) missingFields.push('date');
        if (!apt.start_time && !apt.appointment_time) missingFields.push('start_time');
        
        if (missingFields.length > 0) {
          console.log(`      ⚠️  Campos faltando: ${missingFields.join(', ')}`);
        }
        console.log('');
      });
      
      console.log('✅ Diagnóstico concluído!');
      console.log('');
      console.log('Se os agendamentos não aparecem na interface:');
      console.log('1. Verifique o console do navegador para erros de validação');
      console.log('2. Limpe o cache do navegador (Ctrl+Shift+R)');
      console.log('3. Faça logout e login novamente');
    } else {
      console.log('⚠️  Nenhum agendamento encontrado para esta organização.');
      console.log('   Isso é normal se você ainda não criou agendamentos.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
const email = process.argv[2];
diagnose(email).then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
EOF

# Executar diagnóstico via Firebase Functions
echo "Executando diagnóstico..."
echo ""

# Nota: Este comando requer que você tenha configurado Firebase Functions localmente
# Se não funcionar, use o script Node.js diretamente
firebase functions:shell < /tmp/diagnose-user.js

# Limpar arquivo temporário
rm -f /tmp/diagnose-user.js

echo ""
echo "=========================================="
echo "Diagnóstico concluído!"
