/**
 * Appointment Service - Direct Firestore Access
 * 
 * This service bypasses Cloud Functions and queries Firestore directly.
 * Use this for development when CORS is blocking Cloud Function calls.
 * 
 * To use: Import from this file instead of appointmentService.ts
 */

import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/integrations/firebase/app';
import { AppointmentBase, AppointmentStatus, AppointmentType } from '@/types/appointment';
import { fisioLogger as logger } from '@/lib/errors/logger';

export class AppointmentServiceDirect {
  /**
   * Fetch appointments directly from Firestore
   */
  static async fetchAppointments(
    organizationId: string,
    options: { limit?: number; dateFrom?: string; dateTo?: string } = {}
  ): Promise<AppointmentBase[]> {
    try {
      logger.info('[Direct] Fetching appointments from Firestore', { 
        organizationId, 
        options 
      }, 'AppointmentServiceDirect');

      if (!organizationId) {
        logger.error('[Direct] Organization ID is missing', {}, 'AppointmentServiceDirect');
        return [];
      }

      // Build query
      // Note: orderBy requires a composite index
      // For now, query without orderBy and sort in memory
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('organization_id', '==', organizationId)
      );

      // Execute query
      const querySnapshot = await getDocs(q);
      
      logger.info('[Direct] Firestore query executed', {
        docsCount: querySnapshot.size,
        empty: querySnapshot.empty
      }, 'AppointmentServiceDirect');

      const appointments: AppointmentBase[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Parse date
        let appointmentDate: Date;
        if (data.date instanceof Timestamp) {
          appointmentDate = data.date.toDate();
        } else if (typeof data.date === 'string') {
          const parts = data.date.split('-');
          if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            appointmentDate = new Date(year, month - 1, day, 12, 0, 0);
          } else {
            appointmentDate = new Date(data.date);
          }
        } else {
          appointmentDate = new Date();
        }

        // Parse created_at and updated_at
        const createdAt = data.created_at instanceof Timestamp 
          ? data.created_at.toDate() 
          : new Date(data.created_at || Date.now());
        
        const updatedAt = data.updated_at instanceof Timestamp 
          ? data.updated_at.toDate() 
          : new Date(data.updated_at || Date.now());

        const appointment: AppointmentBase = {
          id: doc.id,
          patientId: data.patient_id || '',
          patientName: data.patient_name || 'Desconhecido',
          phone: data.patient_phone || '',
          date: appointmentDate,
          time: data.start_time || data.appointment_time || '00:00',
          duration: data.duration || 60,
          type: (data.type || 'Fisioterapia') as AppointmentType,
          status: (data.status || 'agendado') as AppointmentStatus,
          notes: data.notes || '',
          createdAt,
          updatedAt,
          therapistId: data.therapist_id,
          room: data.room,
          payment_status: data.payment_status || 'pending',
          payment_method: data.payment_method,
          payment_amount: data.payment_amount,
          session_package_id: data.session_package_id,
        };

        appointments.push(appointment);
      });

      logger.info('[Direct] Appointments processed', {
        totalAppointments: appointments.length,
        sampleAppointment: appointments[0] ? {
          id: appointments[0].id,
          patientName: appointments[0].patientName,
          date: appointments[0].date.toISOString(),
          time: appointments[0].time
        } : null
      }, 'AppointmentServiceDirect');

      // Sort by date descending (most recent first) in memory
      appointments.sort((a, b) => b.date.getTime() - a.date.getTime());

      return appointments;
    } catch (error) {
      logger.error('[Direct] Failed to fetch appointments', error, 'AppointmentServiceDirect');
      throw error;
    }
  }
}
