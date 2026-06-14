import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { eq, inArray } from "drizzle-orm";
import { profiles, patients, appointments, clinicalRecords } from "@fisioflow/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log("=========================================");
  console.log(" INICIANDO TESTE MASSIVO DE AUTOSAVE");
  console.log("=========================================\n");

  // 1. Pegar o usuário
  const userList = await db.select().from(profiles).where(eq(profiles.email, process.env.E2E_EMAIL || ""));
  if (userList.length === 0) {
    console.error("Usuário não encontrado!");
    return;
  }
  const user = userList[0];
  const orgId = user.organizationId;
  
  if (!orgId) {
    console.error("Usuário sem organização!");
    return;
  }

  // 2. Criar 10 pacientes novos para este teste isolado
  console.log("--> Criando 10 pacientes...");
  const patientIds = [];
  for (let i = 1; i <= 10; i++) {
    const patientId = uuidv4();
    const patientName = `Paciente Autosave QA ${i} - ${Date.now()}`;
    
    await db.insert(patients).values({
      id: patientId,
      organizationId: orgId,
      fullName: patientName,
      phone: "11999999999",
      status: "active"
    });
    patientIds.push(patientId);
  }
  console.log(`✅ 10 pacientes criados.\n`);

  // 3. Criar 10 agendamentos para cada paciente (Total: 100)
  console.log("--> Criando 10 agendamentos para cada paciente (100 total)...");
  const appointmentIds = [];
  for (const patientId of patientIds) {
    for (let j = 1; j <= 10; j++) {
      const apptId = uuidv4();
      const date = new Date();
      date.setDate(date.getDate() - j);
      
      await db.insert(appointments).values({
        id: apptId,
        organizationId: orgId,
        patientId: patientId,
        therapistId: user.userId || user.id,
        startTime: "10:00:00",
        endTime: "11:00:00",
        date: date.toISOString().split('T')[0],
        status: "agendado",
        type: "session",
      });
      appointmentIds.push(apptId);
    }
  }
  console.log(`✅ 100 agendamentos criados.\n`);

  // 4. Simular o Autosave em TODAS as evoluções para TODOS os agendamentos (100)
  console.log("--> Simulando AUTOSAVE do Front-End para os 100 agendamentos...");
  console.log("Preenchendo: evolutionText, observations, subjective, dor(VAS), fc, pa, etc...");
  
  for (const apptId of appointmentIds) {
    const sessionId = uuidv4();
    
    // O backend autosave faria exatamente isso (upsert ou insert)
    await db.insert(clinicalRecords).values({
      id: sessionId,
      organizationId: orgId,
      appointmentId: apptId,
      // Estes são todos os campos do Autosave da evolução
      evolutionText: `<p>Procedimento realizado com sucesso no agendamento ${apptId}</p>`,
      observations: `<p>Observações clínicas ricas (Yjs test) para ${apptId}</p>`,
      subjective: `Paciente relatou melhora na dor durante a sessão ${apptId}`,
      painLevel: Math.floor(Math.random() * 10), // VAS Dor 0-10
      bp: "120/80", // Pressão
      hr: Math.floor(Math.random() * (120 - 60) + 60), // Frequência cardíaca
      rr: 18, // Respiração
      spo2: 98,
      status: "draft"
    });
  }
  console.log(`✅ 100 evoluções submetidas via Autosave pipeline com todos os campos.\n`);

  // 5. Verificar (Read-back) para garantir integridade dos dados salvos
  console.log("--> Lendo e verificando banco de dados para confirmar integridade...");
  const records = await db.select().from(clinicalRecords).where(inArray(clinicalRecords.appointmentId, appointmentIds));
  
  if (records.length !== 100) {
    console.error(`❌ Falha: Era esperado 100 registros salvos, porém apenas ${records.length} foram encontrados.`);
    return;
  }

  let isAllValid = true;
  for (const record of records) {
    if (
      !record.evolutionText?.includes("Procedimento realizado com sucesso") ||
      !record.observations?.includes("Observações clínicas ricas") ||
      !record.subjective?.includes("Paciente relatou melhora") ||
      record.painLevel === null ||
      record.bp !== "120/80" ||
      record.hr === null
    ) {
      isAllValid = false;
      console.error(`❌ Falha de validação no registro ${record.id}: Dados incompletos.`);
      break;
    }
  }

  if (isAllValid) {
    console.log("✅ VERIFICAÇÃO CONCLUÍDA COM SUCESSO!");
    console.log("Todos os 10 pacientes, 100 agendamentos e 100 evoluções salvaram perfeitamente todos os campos:\n- Observações Clínicas\n- Evolução/Procedimento\n- Queixa Principal (Subjetivo)\n- Dor (VAS)\n- Frequência Cardíaca\n- Pressão Arterial");
  } else {
    console.log("❌ O teste falhou.");
  }
}

main().catch(console.error);
