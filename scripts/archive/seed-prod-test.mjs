import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const url =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:REDACTED@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(url);

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function formatTime(date) {
  return date.toTimeString().split(" ")[0].substring(0, 8);
}

async function run() {
  console.log("Iniciando geração de dados de teste...");
  try {
    // 1. Pegar org_id e prof_id
    const baseData =
      await sql`SELECT organization_id, profile_id FROM patients WHERE organization_id IS NOT NULL LIMIT 1`;
    if (!baseData || baseData.length === 0) throw new Error("Nenhum dado base encontrado");
    const orgId = baseData[0].organization_id;
    const profId = baseData[0].profile_id;

    console.log(`Org ID: ${orgId}`);
    console.log(`Prof ID: ${profId}`);

    for (let i = 1; i <= 10; i++) {
      const patientId = randomUUID();
      const patientName = `Paciente Teste IA ${i} - ${new Date().getTime()}`;

      console.log(`Cadastrando paciente: ${patientName}`);

      // Criar Paciente
      await sql`
        INSERT INTO patients (id, full_name, organization_id, profile_id, is_active, created_at, updated_at)
        VALUES (${patientId}, ${patientName}, ${orgId}, ${profId}, true, NOW(), NOW())
      `;

      // Criar Prontuário
      const recordId = randomUUID();
      await sql`
        INSERT INTO medical_records (id, patient_id, chief_complaint, created_at, updated_at)
        VALUES (${recordId}, ${patientId}, 'Dor lombar crônica irradiada', NOW(), NOW())
      `;

      // Adicionar Metas e Cirurgias
      if (i % 2 === 0) {
        await sql`
          INSERT INTO surgeries (id, medical_record_id, name, surgery_date, created_at)
          VALUES (${randomUUID()}, ${recordId}, 'Artrodese Lombar L4-L5', NOW() - INTERVAL '1 year', NOW())
        `;
        await sql`
          INSERT INTO goals (id, medical_record_id, description, status, created_at)
          VALUES (${randomUUID()}, ${recordId}, 'Reduzir dor lombar de 8 para 3 na EVA', 'in_progress', NOW())
        `;
      }

      // Adicionar Retorno Médico
      if (i % 3 === 0) {
        await sql`
          INSERT INTO documents (id, organization_id, patient_id, type, title, url, created_at)
          VALUES (${randomUUID()}, ${orgId}, ${patientId}, 'medical_return', 'Retorno Ortopedista Dr. Silva', 'https://example.com/fake.pdf', NOW())
        `;
      }

      // Criar 10 agendamentos (dias diferentes) e 10 evoluções (sessions)
      let baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - 20); // Começar 20 dias atrás

      for (let j = 1; j <= 10; j++) {
        const appointmentId = randomUUID();
        const sessionId = randomUUID();

        baseDate.setDate(baseDate.getDate() + 2); // pular dias para não conflitar
        const aptDateStr = formatDate(baseDate);
        const startTimeStr = formatTime(baseDate);

        const end = new Date(baseDate);
        end.setHours(end.getHours() + 1);
        const endTimeStr = formatTime(end);

        await sql`
          INSERT INTO appointments (id, patient_id, therapist_id, organization_id, date, start_time, end_time, status, type, created_at, updated_at)
          VALUES (${appointmentId}, ${patientId}, ${profId}, ${orgId}, ${aptDateStr}, ${startTimeStr}, ${endTimeStr}, 'atendido', 'session', NOW(), NOW())
        `;

        // Evolução rica
        let sessionNotes = `Sessão ${j}/10 realizada com sucesso. Paciente relata ${j < 5 ? "dor moderada à palpação" : "melhora significativa da mobilidade"}.`;
        let metrics = null;

        if (j === 1 || j === 10) {
          metrics = {
            eva: j === 1 ? 8 : 2,
            rom_flexao: j === 1 ? 40 : 85,
            rom_extensao: j === 1 ? 10 : 30,
          };
          sessionNotes += `\nTeste de Schober realizado. Goniometria da lombar reavaliada. EVA atual: ${j === 1 ? 8 : 2}.`;
        }

        try {
          await sql`
            INSERT INTO sessions (id, patient_id, appointment_id, organization_id, session_date, notes, metrics, status, created_at, updated_at)
            VALUES (${sessionId}, ${patientId}, ${appointmentId}, ${orgId}, ${aptDateStr}, ${sessionNotes}, ${metrics ? JSON.stringify(metrics) : null}::jsonb, 'completed', NOW(), NOW())
          `;
        } catch (e) {
          await sql`
            INSERT INTO sessions (id, patient_id, appointment_id, session_date, notes, metrics, status, created_at, updated_at)
            VALUES (${sessionId}, ${patientId}, ${appointmentId}, ${aptDateStr}, ${sessionNotes}, ${metrics ? JSON.stringify(metrics) : null}::jsonb, 'completed', NOW(), NOW())
          `;
        }
      }
    }
    console.log("Carga de dados finalizada com sucesso!");
  } catch (e) {
    console.error("Erro na carga:", e);
  }
}
run();
