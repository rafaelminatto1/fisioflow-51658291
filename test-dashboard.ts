import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const organizationId = "98765432-1098-7654-3210-987654321098"; // Usually we can use any UUID or one we know.
  
  try {
    const activePatientsRes = await pool.query(
      `SELECT COUNT(DISTINCT patient_id) as count
      FROM appointments
      WHERE organization_id = $1
        AND patient_id IS NOT NULL
        AND deleted_at IS NULL
        AND date >= CURRENT_DATE - 90`,
      [organizationId]
    );
    console.log("active_patients:", activePatientsRes.rows[0]);
  } catch (e) {
    console.error("Error activePatients:", e.message);
  }

  try {
    const revenueRes = await pool.query(
      `SELECT
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as total_payments,
        AVG(amount) as avg_ticket
      FROM payments
      WHERE organization_id = $1
        AND status = 'completed'
        AND paid_at >= date_trunc('day', CURRENT_DATE)
        AND deleted_at IS NULL`,
      [organizationId]
    );
    console.log("revenue:", revenueRes.rows[0]);
  } catch (e) {
    console.error("Error revenue:", e.message);
  }

  try {
    const appointmentsRes = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) filter (where status IN ('completed', 'realizado')) as completed,
        COUNT(*) filter (where status = 'no_show') as no_shows,
        COUNT(*) filter (where status IN ('confirmed', 'scheduled', 'agendado')) as upcoming
      FROM appointments a
      WHERE a.organization_id = $1
        AND a.deleted_at IS NULL AND a.date = CURRENT_DATE`,
      [organizationId]
    );
    console.log("appointments:", appointmentsRes.rows[0]);
  } catch (e) {
    console.error("Error appointments:", e.message);
  }
}

main().finally(() => pool.end());
