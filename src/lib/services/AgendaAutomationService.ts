import { db, collection, getDocs, query, where, orderBy, limit, addDoc } from '@/integrations/firebase/app';
import { WhatsAppService } from './WhatsAppService';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { notificationManager } from './NotificationManager';

export interface AgendaGap {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  therapistId: string;
}

export class AgendaAutomationService {
  /**
   * Detect gaps in the schedule for a specific date and therapist
   */
  static async detectGaps(therapistId: string, date: string): Promise<AgendaGap[]> {
    try {
      const q = query(
        collection(db, 'appointments'),
        where('therapist_id', '==', therapistId),
        where('date', '==', date),
        orderBy('start_time', 'asc')
      );
      
      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => doc.data());
      
      const gaps: AgendaGap[] = [];
      const workStart = "08:00";
      const workEnd = "20:00";
      
      let lastEnd = workStart;
      
      for (const apt of appointments) {
        const start = apt.start_time;
        const duration = this.calculateDuration(lastEnd, start);
        
        if (duration >= 45) {
          gaps.push({
            date,
            startTime: lastEnd,
            endTime: start,
            durationMinutes: duration,
            therapistId
          });
        }
        lastEnd = apt.end_time || this.addMinutes(start, 60);
      }
      
      // Check gap after last appointment
      const finalDuration = this.calculateDuration(lastEnd, workEnd);
      if (finalDuration >= 45) {
        gaps.push({
          date,
          startTime: lastEnd,
          endTime: workEnd,
          durationMinutes: finalDuration,
          therapistId
        });
      }
      
      return gaps;
    } catch (error) {
      logger.error('Failed to detect agenda gaps', error, 'AgendaAutomationService');
      return [];
    }
  }

  /**
   * Notify Admin/Therapist about gaps and waitlist opportunities
   */
  static async notifyAdminOfGaps(therapistId: string, gaps: AgendaGap[], adminPhone?: string) {
    if (gaps.length === 0) return;

    const gap = gaps[0]; // Notify about the most immediate gap
    const title = '🚀 Oportunidade na Agenda';
    const message = `Detectamos um buraco de ${gap.durationMinutes}min hoje às ${gap.startTime}. Temos pacientes na lista de espera!`;

    // 1. Push Notification via FCM (App)
    try {
      await notificationManager.notify({
        title,
        body: message,
        data: {
          type: 'agenda_gap',
          gapDate: gap.date,
          startTime: gap.startTime
        }
      });
    } catch (e) {
      logger.warn('Failed to send push notification for gap', e);
    }

    // 2. WhatsApp Notification for Admin
    if (adminPhone) {
      try {
        const waMessage = `*FisioFlow AI - Alerta de Agenda* 📅

Olá! Detectamos um horário vago hoje:

📍 *Horário:* ${gap.startTime} às ${gap.endTime}
⏳ *Duração:* ${gap.durationMinutes}min

Existem pacientes aguardando na lista de espera. Deseja que eu envie uma oferta de vaga para eles?

🔗 Clique para ver a lista: https://fisioflow.app/agenda?date=${gap.date}`;
        
        await WhatsAppService.sendMessage({
          to: adminPhone,
          message: waMessage
        });
      } catch (e) {
        logger.warn('Failed to send WhatsApp notification for gap', e);
      }
    }
  }

  private static calculateDuration(start: string, end: string): number {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  }

  private static addMinutes(time: string, mins: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = (Math.floor(total / 60) % 24).toString().padStart(2, '0');
    const newM = (total % 60).toString().padStart(2, '0');
    return `${newH}:${newM}`;
  }
}
