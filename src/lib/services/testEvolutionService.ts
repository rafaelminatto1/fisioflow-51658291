import { evolutionApi, patientsApi } from "@/api/v2";
import type {
  AssessmentTestConfig,
  TestEvolutionData,
  TestResult,
  TestStatistics,
} from "@/types/evolution";

const normalizeAlertLevel = (value?: string | null): AssessmentTestConfig["alert_level"] => {
  if (value === "critico" || value === "high") return "critico";
  if (value === "importante" || value === "medium") return "importante";
  return "leve";
};

export class TestEvolutionService {
  static async getTestEvolutionData(
    patientId: string,
    testName: string,
  ): Promise<TestEvolutionData[]> {
    const res = await evolutionApi.measurements.list(patientId, { limit: 500 });
    const rows = (res.data ?? [])
      .filter((item) => item.measurement_name === testName)
      .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());

    return rows.map((item, index) => ({
      id: item.id,
      patient_id: item.patient_id,
      test_name: item.measurement_name,
      date: item.measured_at.split("T")[0],
      value: Number(item.value ?? 0),
      unit: item.unit ?? undefined,
      session_number: index + 1,
      variation: index > 0 ? Number(item.value ?? 0) - Number(rows[index - 1].value ?? 0) : 0,
    }));
  }

  static async getTestHistory(patientId: string): Promise<Map<string, TestEvolutionData[]>> {
    const res = await evolutionApi.measurements.list(patientId, { limit: 500 });
    const rows = [...(res.data ?? [])].sort(
      (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime(),
    );

    const historyMap = new Map<string, TestEvolutionData[]>();

    rows.forEach((item) => {
      const testName = item.measurement_name;
      const previous = historyMap.get(testName) ?? [];
      const previousValue = previous.length > 0 ? previous[previous.length - 1].value : null;

      const current: TestEvolutionData = {
        id: item.id,
        patient_id: item.patient_id,
        test_name: testName,
        date: item.measured_at.split("T")[0],
        value: Number(item.value ?? 0),
        unit: item.unit ?? undefined,
        session_number: previous.length + 1,
        variation: previousValue !== null ? Number(item.value ?? 0) - previousValue : 0,
      };

      historyMap.set(testName, [...previous, current]);
    });

    return historyMap;
  }

  static async addTestResult(
    patientId: string,
    sessionId: string,
    result: Omit<TestResult, "id" | "created_at">,
  ): Promise<void> {
    await evolutionApi.measurements.create({
      patient_id: patientId,
      measurement_type: result.test_type,
      measurement_name: result.test_name,
      value: result.value,
      unit: result.unit,
      notes: result.notes,
      measured_at: result.measured_at,
      custom_data: {
        soap_record_id: sessionId,
        session_id: sessionId,
        measured_by: result.measured_by,
      },
    });
  }

  static async getMandatoryTests(
    patientId: string,
    sessionNumber: number,
  ): Promise<AssessmentTestConfig[]> {
    const pathologiesRes = await patientsApi.pathologies(patientId);
    const activePathologies = (pathologiesRes.data ?? [])
      .filter((row) => row.status === "active" || row.status === "em_tratamento")
      .map((row) => row.name)
      .filter(Boolean);

    if (activePathologies.length === 0) return [];

    const testsRes = await evolutionApi.requiredMeasurements.list(activePathologies);
    return (testsRes.data ?? [])
      .map((test) => ({
        id: String(test.id),
        pathology_name: String(test.pathology_name),
        test_name: String(test.measurement_name),
        test_type: "measurement",
        frequency_sessions: 1,
        is_mandatory: true,
        alert_level: normalizeAlertLevel(test.alert_level),
        instructions: test.instructions ?? undefined,
        unit: test.measurement_unit ?? undefined,
        min_value: undefined,
        max_value: undefined,
      }))
      .filter((test) => sessionNumber % test.frequency_sessions === 0);
  }

  static async checkMandatoryTestsCompleted(
    patientId: string,
    sessionId: string,
  ): Promise<boolean> {
    const res = await evolutionApi.measurements.list(patientId, { limit: 500 });
    const completedTests = new Set(
      (res.data ?? [])
        .filter((item) => {
          const customData = item.custom_data ?? {};
          return customData?.soap_record_id === sessionId || customData?.session_id === sessionId;
        })
        .map((item) => item.measurement_name),
    );

    const mandatoryTests = await this.getMandatoryTests(patientId, 1);
    const criticalTests = mandatoryTests
      .filter((t) => t.alert_level === "critico")
      .map((t) => t.test_name);

    return criticalTests.every((test) => completedTests.has(test));
  }

  static async getTestStatistics(patientId: string, testName: string): Promise<TestStatistics> {
    const evolutionData = await this.getTestEvolutionData(patientId, testName);

    if (evolutionData.length === 0) {
      return {
        test_name: testName,
        count: 0,
        min_value: 0,
        max_value: 0,
        avg_value: 0,
        last_value: 0,
        first_value: 0,
        total_variation: 0,
        improvement_percentage: 0,
      };
    }

    const values = evolutionData.map((d) => d.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    return {
      test_name: testName,
      count: values.length,
      min_value: Math.min(...values),
      max_value: Math.max(...values),
      avg_value: values.reduce((a, b) => a + b, 0) / values.length,
      last_value: lastValue,
      first_value: firstValue,
      total_variation: lastValue - firstValue,
      improvement_percentage: firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0,
    };
  }
}
