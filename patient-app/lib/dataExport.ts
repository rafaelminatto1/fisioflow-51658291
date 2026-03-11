import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { patientApi } from '@/lib/api';
import { log } from '@/lib/logger';

export interface PatientDataExport {
  metadata: {
    exportedAt: string;
    exportedBy: string;
    version: string;
    format: 'FisioFlow-Patient-Export-v2';
  };
  patient: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    cpf?: string;
    birthDate?: string;
    address?: Record<string, unknown>;
    createdAt: string;
  };
  exercises: {
    assignments: any[];
    completions: any[];
  };
  appointments: any[];
  evolutions: any[];
  reports: any[];
  communications: {
    sent: any[];
    received: any[];
  };
  healthData: Record<string, unknown>;
}

export interface DataExportOptions {
  includeEvolutions?: boolean;
  includeMessages?: boolean;
  includeHealthData?: boolean;
}

export class DataExporter {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async exportAll(options: DataExportOptions = {}): Promise<PatientDataExport> {
    const {
      includeEvolutions = true,
      includeMessages = true,
      includeHealthData = true,
    } = options;

    try {
      const [profile, exercises, appointments, progress] = await Promise.all([
        patientApi.getProfile(),
        patientApi.getExercises(),
        patientApi.getAppointments(),
        includeEvolutions ? patientApi.getProgress() : Promise.resolve({ evolutions: [], reports: [] }),
      ]);

      return {
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedBy: this.userId,
          version: '2.0.0',
          format: 'FisioFlow-Patient-Export-v2',
        },
        patient: {
          id: profile?.patient_id || profile?.id || this.userId,
          name: profile?.name || '',
          email: profile?.email || '',
          phone: profile?.phone || undefined,
          cpf: profile?.cpf || undefined,
          birthDate: profile?.birth_date || undefined,
          address: profile?.address || undefined,
          createdAt: profile?.created_at || new Date().toISOString(),
        },
        exercises: {
          assignments: exercises,
          completions: exercises.filter((exercise: any) => exercise.completed),
        },
        appointments,
        evolutions: includeEvolutions ? progress.evolutions || [] : [],
        reports: includeEvolutions ? progress.reports || [] : [],
        communications: includeMessages ? { sent: [], received: [] } : { sent: [], received: [] },
        healthData: includeHealthData ? {} : {},
      };
    } catch (error) {
      log.error('Error exporting patient data:', error);
      throw new Error('Falha ao exportar dados: ' + (error as Error).message);
    }
  }

  async exportToFile(options: DataExportOptions = {}): Promise<string> {
    const data = await this.exportAll(options);
    const fileUri = `${FileSystem.cacheDirectory}fisioflow-patient-export-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return fileUri;
  }

  async exportAndShare(options: DataExportOptions = {}): Promise<void> {
    const fileUri = await this.exportToFile(options);

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Exportação concluída', `Arquivo salvo em: ${fileUri}`);
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar dados do paciente',
    });
  }
}

export async function exportAndSharePatientData(
  userId: string,
  options: DataExportOptions = {},
): Promise<void> {
  const exporter = new DataExporter(userId);
  await exporter.exportAndShare(options);
}
