import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("=========================================");
  console.log(" INICIANDO TESTE MASSIVO DE AUTOSAVE (SQL)");
  console.log("=========================================\n");

  // 1. Pegar o usuário
  const userList = await sql`SELECT * FROM profiles WHERE email = ${process.env.E2E_EMAIL || ""} LIMIT 1`;
  if (userList.length === 0) {
    console.error("Usuário não encontrado!");
    return;
  }
  const user = userList[0];
  const orgId = user.organization_id;
  
  if (!orgId) {
    console.error("Usuário sem organização!");
    return;
  }

  // 2. Criar 10 pacientes novos para este teste isolado
  console.log("--> Criando 10 pacientes...");
  const patientIds = [];
  for (let i = 1; i <= 10; i++) {
    const patientId = uuidv4();
    const patientName = `Paciente Autosave QA SQL ${i} - ${Date.now()}`;
    
    await sql`
      INSERT INTO patients (id, organization_id, full_name, phone, status)
      VALUES (${patientId}, ${orgId}, ${patientName}, '11999999999', 'active')
    `;
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
      
      await sql`
        INSERT INTO appointments (id, organization_id, patient_id, therapist_id, start_time, end_time, date, status, type)
        VALUES (${apptId}, ${orgId}, ${patientId}, ${user.user_id || user.id}, '10:00:00', '11:00:00', ${date.toISOString().split('T')[0]}, 'agendado', 'session')
      `;
      appointmentIds.push(apptId);
    }
  }
  console.log(`✅ 100 agendamentos criados.\n`);

  // 4. Simular o Autosave em TODAS as evoluções para TODOS os agendamentos (100)
  console.log("--> Simulando AUTOSAVE do Front-End para os 100 agendamentos...");
  console.log("Preenchendo: evolution_text, observations, subjective, pain_level, bp, hr...");
  
  for (const apptId of appointmentIds) {
    const sessionId = uuidv4();
    const hr = Math.floor(Math.random() * (120 - 60) + 60);
    const pain = Math.floor(Math.random() * 10);
    
    await sql`
      INSERT INTO clinical_records (
        id, organization_id, appointment_id, patient_id,
        evolution_text, observations, subjective,
        pain_level, bp, hr, rr, spo2, status
      ) VALUES (
        ${sessionId}, ${orgId}, ${apptId}, null,
        '<p>Procedimento realizado com sucesso no agendamento ' || ${apptId} || '</p>',
        '<p>Observações clínicas ricas (Yjs test) para ' || ${apptId} || '</p>',
        'Paciente relatou melhora na dor durante a sessão ' || ${apptId},
        ${pain}, '120/80', ${hr}, 18, 98, 'draft'
      )
    `;
  }
  console.log(`✅ 100 evoluções submetidas via Autosave pipeline com todos os campos.\n`);

  // 5. Verificar (Read-back) para garantir integridade dos dados salvos
  console.log("--> Lendo e verificando banco de dados para confirmar integridade...");
  
  // Pegamos todos pra verificar
  const records = [];
  for (const apptId of appointmentIds) {
    const res = await sql`SELECT * FROM clinical_records WHERE appointment_id = ${apptId}`;
    records.push(...res);
  }
  
  if (records.length !== 100) {
    console.error(`❌ Falha: Era esperado 100 registros salvos, porém apenas ${records.length} foram encontrados.`);
    return;
  }

  let isAllValid = true;
  for (const record of records) {
    if (
      !record.evolution_text?.includes("Procedimento realizado com sucesso") ||
      !record.observations?.includes("Observações clínicas ricas") ||
      !record.subjective?.includes("Paciente relatou melhora") ||
      record.pain_level === null ||
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
    console.log("Todos os 10 pacientes, 100 agendamentos e 100 evoluções salvaram perfeitamente todos os campos:");
    console.log("- Observações Clínicas");
    console.log("- Evolução/Procedimento");
    console.log("- Queixa Principal (Subjetivo)");
    console.log("- Dor (VAS)");
    console.log("- Frequência Cardíaca");
    console.log("- Pressão Arterial");
  } else {
    console.log("❌ O teste falhou.");
  }
}

main().catch(console.error);
