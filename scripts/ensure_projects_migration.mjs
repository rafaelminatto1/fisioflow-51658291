import { neon } from "@neondatabase/serverless";

const connectionstring =
	"postgresql://neondb_owner:REDACTED-NEON-PASSWORD@ep-wandering-bonus-acj4zwvo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(connectionstring);

async function runMigration() {
	console.log("Executing migration: ensure_tarefas_projects.sql");

	try {
		console.log("Creating projects table...");
		await sql`CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      start_date DATE,
      end_date DATE,
      created_by UUID NOT NULL,
      manager_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

		await sql`CREATE INDEX IF NOT EXISTS idx_projects_org_created ON projects (organization_id, created_at DESC)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects (organization_id, status)`;

		console.log("Creating tarefas table...");
		await sql`CREATE TABLE IF NOT EXISTS tarefas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      created_by TEXT NOT NULL,
      responsavel_id TEXT,
      project_id UUID,
      parent_id UUID,
      titulo TEXT NOT NULL,
      descricao TEXT,
      status TEXT NOT NULL DEFAULT 'A_FAZER',
      prioridade TEXT NOT NULL DEFAULT 'MEDIA',
      tipo TEXT NOT NULL DEFAULT 'TAREFA',
      data_vencimento TIMESTAMPTZ,
      start_date TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      order_index INTEGER NOT NULL DEFAULT 0,
      tags TEXT[] NOT NULL DEFAULT '{}',
      checklists JSONB NOT NULL DEFAULT '[]',
      attachments JSONB NOT NULL DEFAULT '[]',
      task_references JSONB NOT NULL DEFAULT '[]',
      dependencies JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

		await sql`CREATE INDEX IF NOT EXISTS idx_tarefas_org_status ON tarefas (organization_id, status, order_index)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_tarefas_project ON tarefas (project_id, order_index)`;

		console.log("Creating user_invitations table...");
		await sql`CREATE TABLE IF NOT EXISTS user_invitations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'fisioterapeuta',
      token TEXT NOT NULL UNIQUE,
      invited_by TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

		await sql`CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email, used_at)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_user_invitations_org ON user_invitations(organization_id, created_at DESC)`;

		console.log("Creating satisfaction_surveys table...");
		await sql`CREATE TABLE IF NOT EXISTS satisfaction_surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL,
      patient_id UUID,
      appointment_id UUID,
      therapist_id TEXT,
      nps_score INTEGER,
      q_care_quality INTEGER,
      q_professionalism INTEGER,
      q_facility_cleanliness INTEGER,
      q_scheduling_ease INTEGER,
      q_communication INTEGER,
      comments TEXT,
      suggestions TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      response_time_hours NUMERIC(6,2),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

		await sql`CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_org ON satisfaction_surveys(organization_id, created_at DESC)`;
		await sql`CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_patient ON satisfaction_surveys(patient_id, created_at DESC)`;

		console.log("Creating profiles table...");
		await sql`CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT,
      name VARCHAR(255),
      email VARCHAR(255),
      full_name VARCHAR(255),
      role VARCHAR(50),
      organization_id UUID,
      avatar_url TEXT,
      created_at TIMESTAMP DEFAULT now() NOT NULL,
      updated_at TIMESTAMP DEFAULT now() NOT NULL
    )`;

		console.log("✅ Migration completed successfully!");
		console.log(
			"✅ Tables created/verified: projects, tarefas, user_invitations, satisfaction_surveys, profiles",
		);
	} catch (error) {
		console.error("❌ Migration failed:", error);
		throw error;
	}
}

runMigration()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
