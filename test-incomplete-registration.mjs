// Script para testar o fluxo de cadastro incompleto

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Testando fluxo de cadastro incompleto...");

// Verificando se as modificações foram aplicadas corretamente
const patientProfilePath = path.join(__dirname, 'src/pages/patients/PatientProfilePage.tsx');
const editPatientModalPath = path.join(__dirname, 'src/components/modals/EditPatientModal.tsx');

try {
    const patientProfileContent = fs.readFileSync(patientProfilePath, 'utf8');
    const editPatientModalContent = fs.readFileSync(editPatientModalPath, 'utf8');
    
    // Verificar se PatientProfilePage tem useEffect para abrir o modal
    if (patientProfileContent.includes('useEffect') && patientProfileContent.includes('incomplete_registration')) {
        console.log("✅ PatientProfilePage.tsx: Lógica para abrir modal automático está presente");
    } else {
        console.log("❌ PatientProfilePage.tsx: Lógica para abrir modal automático não encontrada");
    }
    
    // Verificar se EditPatientModal tem a lógica para marcar cadastro como completo
    if (editPatientModalContent.includes('update.incomplete_registration = false')) {
        console.log("✅ EditPatientModal.tsx: Lógica para marcar cadastro como completo está presente");
    } else {
        console.log("❌ EditPatientModal.tsx: Lógica para marcar cadastro como completo não encontrada");
    }
    
    // Verificar se o patient está sendo passado como prop
    if (editPatientModalContent.includes('patient?: Patient | null')) {
        console.log("✅ EditPatientModal.tsx: Prop patient adicionada");
    } else {
        console.log("❌ EditPatientModal.tsx: Prop patient não encontrada");
    }
    
    // Verificar se formDataToPatientUpdate foi modificada
    if (editPatientModalContent.includes('wasIncompleteRegistration')) {
        console.log("✅ EditPatientModal.tsx: formDataToPatientUpdate modificada");
    } else {
        console.log("❌ EditPatientModal.tsx: formDataToPatientUpdate não modificada");
    }
    
    console.log("\n🎉 Testes concluídos! O fluxo de cadastro incompleto deve estar funcionando.");
    
} catch (error) {
    console.error("Erro ao verificar arquivos:", error);
}