import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  console.log("Iniciando inserção massiva usando SQL raw...");
  
  // 1. Pegar o usuário e organização (rafael.minatto@yahoo.com.br)
  const userList = await sql`SELECT id, organization_id as "organizationId" FROM profiles WHERE email = 'rafael.minatto@yahoo.com.br'`;
  if (userList.length === 0) {
    console.error("Usuário não encontrado!");
    return;
  }
  const user = userList[0];
  const orgId = user.organizationId;
  const userId = user.id;
  
  if (!orgId) {
    console.error("Usuário sem organização!");
    return;
  }

  // 2. Criar 10 pacientes
  for (let i = 1; i <= 10; i++) {
    const patientId = uuidv4();
    const patientName = `Paciente Autosave Drizzle ${i} ${Math.floor(Math.random() * 1000)}`;
    
    await sql`
      INSERT INTO patients (id, organization_id, full_name, phone, status)
      VALUES (${patientId}, ${orgId}, ${patientName}, '11999999999', 'active')
    `;
    console.log(`Paciente criado: ${patientName}`);

    // 3. Criar 10 agendamentos para cada paciente HOJE
    for (let j = 1; j <= 10; j++) {
      const apptId = uuidv4();
      const date = new Date();
      // same day, different hours (8 to 17)
      const dateStr = date.toISOString().split('T')[0];
      const startHour = 7 + j; // 8 to 17
      
      await sql`
        INSERT INTO appointments (
          id, organization_id, patient_id, therapist_id, date, start_time, end_time, status, type, duration_minutes
        ) VALUES (
          ${apptId}, ${orgId}, ${patientId}, ${userId}, ${dateStr}, ${startHour + ':00:00'}, ${startHour + ':45:00'}, 'agendado', 'session', 45
        )
      `;
    }
    console.log(`10 Agendamentos criados para: ${patientName}`);
  }
  
  console.log("Concluído!");
}

main().catch(console.error);
