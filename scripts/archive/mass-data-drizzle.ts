import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { profiles } from "../packages/db/src/schema/organizations.ts";
import { patients } from "../packages/db/src/schema/patients.ts";
import { appointments } from "../packages/db/src/schema/appointments.ts";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function main() {
  console.log("Iniciando inserção massiva...");

  // 1. Pegar o usuário e organização (admin@example.com)
  const userList = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, process.env.E2E_EMAIL || ""));
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

  // 2. Criar 10 pacientes
  for (let i = 1; i <= 10; i++) {
    const patientId = uuidv4();
    const patientName = `Paciente Autosave Drizzle ${i} ${Math.floor(Math.random() * 1000)}`;

    await db.insert(patients).values({
      id: patientId,
      organizationId: orgId,
      fullName: patientName,
      phone: "11999999999",
      status: "active",
    });
    console.log(`Paciente criado: ${patientName}`);

    // 3. Criar 10 agendamentos para cada paciente
    for (let j = 1; j <= 10; j++) {
      const apptId = uuidv4();
      const date = new Date();
      date.setDate(date.getDate() - j); // Dias passados

      await db.insert(appointments).values({
        id: apptId,
        organizationId: orgId,
        patientId: patientId,
        therapistId: user.userId || user.id, // therapist_id maps to user's auth id or profile id
        startTime: new Date(date.setHours(10, 0, 0, 0)).toTimeString().split(" ")[0], // time string
        endTime: new Date(date.setHours(11, 0, 0, 0)).toTimeString().split(" ")[0], // time string
        date: date.toISOString().split("T")[0],
        status: "agendado",
        type: "session",
      });
    }
    console.log(`10 Agendamentos criados para: ${patientName}`);
  }

  console.log("Concluído!");
}

main().catch(console.error);
