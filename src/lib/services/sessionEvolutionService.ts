import { evolutionApi, sessionsApi } from "@/api/v2";
import type { SessionEvolution, SessionEvolutionFormData, TestResult } from "@/types/evolution";

const mapTestResult = (sessionId: string, row: Record<string, unknown>): TestResult => ({
  id: String(row.id),
  session_id: sessionId,
  patient_id: String(row.patient_id),
  test_name: String(row.measurement_name),
  test_type: String(row.measurement_type),
  value: Number(row.value ?? 0),
  unit: (row.unit as string) ?? undefined,
  notes: (row.notes as string) ?? undefined,
  measured_by: String(row.created_by ?? ""),
  measured_at: String(row.measured_at),
  created_at: String(row.created_at),
});

export class SessionEvolutionService {
  static async calculateSessionNumber(patientId: string, recordDate: string): Promise<number> {
    const res = await sessionsApi.list({ patientId, limit: 500 });
    return (res.data ?? []).filter((session) => session.record_date < recordDate).length + 1;
  }

  static async getSessionEvolution(sessionId: string): Promise<SessionEvolution | null> {
    const sessionRes = await sessionsApi.get(sessionId).catch(() => null);
    if (!sessionRes?.data) return null;

    const session = sessionRes.data;
    const measurementsRes = await evolutionApi.measurements.list(session.patient_id, {
      limit: 500,
    });
    const testResults = (measurementsRes.data ?? [])
      .filter((row) => {
        const customData = row.custom_data ?? {};
        return customData?.soap_record_id === sessionId || customData?.session_id === sessionId;
      })
      .map((row) => mapTestResult(sessionId, row as unknown as Record<string, unknown>));

    const sessionNumber = await this.calculateSessionNumber(
      session.patient_id,
      session.record_date,
    );

    return {
      id: session.id,
      session_id: session.appointment_id || session.id,
      patient_id: session.patient_id,
      session_date: session.record_date,
      session_number: sessionNumber,
      subjective: session.subjective || "",
      objective: session.objective || "",
      assessment: session.assessment || "",
      plan: session.plan || "",
      pain_level: session.pain_level,
      evolution_notes: undefined,
      test_results: testResults,
      created_by: session.created_by || "",
      created_at: session.created_at,
      updated_at: session.updated_at,
    };
  }

  static async saveSessionEvolution(data: SessionEvolutionFormData): Promise<SessionEvolution> {
    const now = new Date().toISOString();
    const createdRes = await sessionsApi.create({
      patient_id: data.patient_id,
      appointment_id: data.session_id,
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      created_by: data.created_by,
      record_date: data.session_date,
      status: "draft",
      pain_level: data.pain_level,
      created_at: now,
      updated_at: now,
    });

    const created = createdRes.data;

    if (data.test_results?.length) {
      await Promise.all(
        data.test_results.map((result) =>
          evolutionApi.measurements.create({
            patient_id: data.patient_id,
            measurement_type: result.test_type,
            measurement_name: result.test_name,
            value: result.value,
            unit: result.unit,
            notes: result.notes,
            measured_at: result.measured_at,
            custom_data: {
              soap_record_id: created.id,
              session_id: created.id,
              measured_by: result.measured_by,
            },
          }),
        ),
      );
    }

    return (await this.getSessionEvolution(created.id)) as SessionEvolution;
  }

  static async updateSessionEvolution(
    sessionId: string,
    data: Partial<SessionEvolutionFormData>,
  ): Promise<SessionEvolution> {
    await sessionsApi.update(sessionId, {
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan,
      record_date: data.session_date,
      updated_at: new Date().toISOString(),
    });

    return (await this.getSessionEvolution(sessionId)) as SessionEvolution;
  }

  static async deleteSessionEvolution(sessionId: string): Promise<void> {
    await sessionsApi.delete(sessionId);
  }

  static async getEvolutionsByPatientId(patientId: string): Promise<SessionEvolution[]> {
    const res = await sessionsApi.list({ patientId, limit: 10 });
    const rows = res.data ?? [];
    const evolutions = await Promise.all(rows.map((row) => this.getSessionEvolution(row.id)));
    return evolutions.filter(Boolean) as SessionEvolution[];
  }
}
