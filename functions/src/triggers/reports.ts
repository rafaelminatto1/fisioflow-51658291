import * as functions from 'firebase-functions/v2';
import { FCMService } from '../integrations/fcm/fcm.service';

const fcmService = new FCMService();

export const onReportCreated = functions.firestore.onDocumentCreated(
  'relatorios_medicos/{reportId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const report = snapshot.data();
    const patientId = report.patientId;

    if (!patientId) return;

    await fcmService.sendToUser(patientId, {
      title: 'Novo Laudo Disponível 📄',
      body: `Seu relatório médico (${report.tipo_relatorio || 'Geral'}) acaba de ser disponibilizado.`,
      data: {
        type: 'new_report',
        reportId: snapshot.id,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For mobile apps
      }
    });
  }
);
