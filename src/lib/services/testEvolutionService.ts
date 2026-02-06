import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit } from '@/integrations/firebase/app';
import type { TestEvolutionData, TestStatistics, AssessmentTestConfig } from '@/types/evolution';
import { normalizeFirestoreData } from '@/utils/firestoreData';

export class TestEvolutionService {
  static async getTestEvolutionData(patientId: string, testName: string): Promise<TestEvolutionData[]> {
    const q = query(
      collection(db, 'evolution_measurements'),
      where('patient_id', '==', patientId),
      where('measurement_name', '==', testName),
      orderBy('measured_at', 'asc')
    );
    const snapshot = await getDocs(q);

    const data = snapshot.docs.map(docSnap => docSnap.data());

    // Transform to TestEvolutionData format
    return data.map((item, index) => ({
      id: item.id,
      patient_id: item.patient_id,
      test_name: item.measurement_name,
      date: item.measured_at.split('T')[0],
      value: Number(item.value),
      unit: item.unit || undefined,
      session_number: index + 1,
      variation: index > 0 ? Number(item.value) - Number(data[index - 1].value) : 0
    })) as TestEvolutionData[];
  }

  static async getTestHistory(patientId: string): Promise<Map<string, TestEvolutionData[]>> {
    const q = query(
      collection(db, 'evolution_measurements'),
      where('patient_id', '==', patientId),
      orderBy('measured_at', 'asc')
    );
    const snapshot = await getDocs(q);

    const historyMap = new Map<string, TestEvolutionData[]>();

    snapshot.docs.forEach((docSnap, index, arr) => {
      const item = docSnap.data();
      const testName = item.measurement_name;
      if (!historyMap.has(testName)) {
        historyMap.set(testName, []);
      }

      const previousTests = arr.slice(0, index).filter(t => t.data().measurement_name === testName);
      const sessionNumber = previousTests.length + 1;
      const previousValue = previousTests.length > 0 ? Number(previousTests[previousTests.length - 1].data().value) : null;

      historyMap.get(testName)!.push({
        id: docSnap.id,
        patient_id: item.patient_id,
        test_name: item.measurement_name,
        date: item.measured_at.split('T')[0],
        value: Number(item.value),
        unit: item.unit || undefined,
        session_number: sessionNumber,
        variation: previousValue !== null ? Number(item.value) - previousValue : 0
      });
    });

    return historyMap;
  }

  static async addTestResult(patientId: string, sessionId: string, result: Omit<TestResult, 'id' | 'created_at'>): Promise<void> {
    await addDoc(collection(db, 'evolution_measurements'), {
      patient_id: patientId,
      soap_record_id: sessionId,
      measurement_name: result.test_name,
      measurement_type: result.test_type,
      value: result.value,
      unit: result.unit,
      notes: result.notes,
      measured_at: result.measured_at,
      created_by: result.measured_by,
      created_at: new Date().toISOString(),
    });
  }

  static async getMandatoryTests(patientId: string, sessionNumber: number): Promise<AssessmentTestConfig[]> {
    // Get patient pathologies
    const pathQ = query(
      collection(db, 'patient_pathologies'),
      where('patient_id', '==', patientId),
      where('status', '==', 'em_tratamento')
    );
    const pathSnapshot = await getDocs(pathQ);

    if (pathSnapshot.empty) return [];

    const pathologyNames = pathSnapshot.docs.map(doc => normalizeFirestoreData(doc.data()).pathology_name);

    // Get mandatory tests for these pathologies
    // NOTE: Firestore doesn't support 'in' queries well with arrays
    // In production, this should use a Cloud Function or composite index
    const testsQ = query(
      collection(db, 'pathology_required_measurements')
    );
    const testsSnapshot = await getDocs(testsQ);

    const filteredTests = testsSnapshot.docs.filter(docSnap =>
      pathologyNames.includes(docSnap.data().pathology_name)
    );

    // Filter by frequency (check if test should be done at this session)
    return filteredTests
      .map(docSnap => {
        const test = docSnap.data();
        return {
          id: docSnap.id,
          pathology_name: test.pathology_name,
          test_name: test.measurement_name,
          test_type: 'measurement',
          frequency_sessions: 1, // Default
          is_mandatory: true,
          alert_level: test.alert_level as 'critico' | 'importante' | 'leve',
          instructions: test.instructions || undefined,
          unit: test.measurement_unit || undefined,
          min_value: undefined,
          max_value: undefined
        };
      })
      .filter(test => sessionNumber % test.frequency_sessions === 0);
  }

  static async checkMandatoryTestsCompleted(patientId: string, sessionId: string): Promise<boolean> {
    const q = query(
      collection(db, 'evolution_measurements'),
      where('patient_id', '==', patientId),
      where('soap_record_id', '==', sessionId)
    );
    const snapshot = await getDocs(q);

    const completedTests = new Set(snapshot.docs.map(doc => normalizeFirestoreData(doc.data()).measurement_name));
    const mandatoryTests = await this.getMandatoryTests(patientId, 1); // Simplified
    const criticalTests = mandatoryTests
      .filter(t => t.alert_level === 'critico')
      .map(t => t.test_name);

    return criticalTests.every(test => completedTests.has(test));
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
        improvement_percentage: 0
      };
    }

    const values = evolutionData.map(d => d.value);
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
      improvement_percentage: firstValue !== 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0
    };
  }
}