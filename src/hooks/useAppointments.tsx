import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Appointment, 
  EnhancedAppointment, 
  AppointmentConflict,
  AppointmentFilters,
  AlternativeSlot,
  TimeSlot,
  RecurrencePattern,
  AppointmentStatistics
} from '@/types/appointment';
import { addDays, format, isAfter, isBefore, isEqual, parseISO, startOfDay, endOfDay } from 'date-fns';

interface UseAppointmentsOptions {
  dateRange?: { start: Date; end: Date };
  enableRealTime?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<EnhancedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([]);
  
  const { dateRange, enableRealTime = false, autoRefresh = false, refreshInterval = 30000 } = options;

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(id, name, phone, email),
          therapists(id, name, specialties),
          rooms(id, name, capacity)
        `);
      
      // Apply date range filter if provided
      if (dateRange) {
        query = query
          .gte('appointment_date', format(dateRange.start, 'yyyy-MM-dd'))
          .lte('appointment_date', format(dateRange.end, 'yyyy-MM-dd'));
      }
      
      query = query
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      const { data: appointmentsData, error: appointmentsError } = await query;

      if (appointmentsError) throw appointmentsError;

      const formattedAppointments: EnhancedAppointment[] = appointmentsData?.map(appointment => ({
        id: appointment.id,
        patientId: appointment.patient_id,
        patientName: appointment.patients?.name || 'Paciente não encontrado',
        date: new Date(appointment.appointment_date),
        time: appointment.appointment_time,
        duration: appointment.duration,
        type: appointment.type,
        status: appointment.status,
        notes: appointment.notes || '',
        phone: appointment.patients?.phone || '',
        
        // Enhanced fields
        therapistId: appointment.therapist_id,
        therapistName: appointment.therapists?.name,
        roomId: appointment.room_id,
        roomName: appointment.rooms?.name,
        equipment: appointment.equipment || [],
        recurrenceId: appointment.recurrence_id,
        isRecurring: appointment.is_recurring || false,
        recurrencePattern: appointment.recurrence_pattern ? 
          JSON.parse(appointment.recurrence_pattern) : undefined,
        priority: appointment.priority || 'Normal',
        specialRequirements: appointment.special_requirements,
        reminderSent: appointment.reminder_sent || false,
        confirmationSent: appointment.confirmation_sent || false,
        lastReminderSent: appointment.last_reminder_sent ? 
          new Date(appointment.last_reminder_sent) : undefined,
        previousAppointmentId: appointment.previous_appointment_id,
        nextAppointmentId: appointment.next_appointment_id,
        treatmentPhase: appointment.treatment_phase,
        sessionNumber: appointment.session_number,
        preferredTime: appointment.preferred_time,
        preferredDays: appointment.preferred_days ? 
          JSON.parse(appointment.preferred_days) : [],
        cancellationReason: appointment.cancellation_reason,
        rescheduledFromId: appointment.rescheduled_from_id,
        rescheduledToId: appointment.rescheduled_to_id,
        cancellationTimestamp: appointment.cancellation_timestamp ? 
          new Date(appointment.cancellation_timestamp) : undefined,
        color: appointment.color || getDefaultColor(appointment.type),
        externalCalendarId: appointment.external_calendar_id,
        syncedWithGoogle: appointment.synced_with_google || false,
        syncedWithOutlook: appointment.synced_with_outlook || false,
        
        createdAt: new Date(appointment.created_at),
        updatedAt: new Date(appointment.updated_at),
      })) || [];

      setAppointments(formattedAppointments);
      
      // Detect conflicts for newly loaded appointments
      const detectedConflicts = await detectConflicts(formattedAppointments);
      setConflicts(detectedConflicts);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const addAppointment = useCallback(async (
    appointmentData: Omit<EnhancedAppointment, 'id' | 'patientName' | 'phone' | 'createdAt' | 'updatedAt'>,
    options: { skipConflictCheck?: boolean; createRecurring?: boolean } = {}
  ) => {
    try {
      setSyncing(true);
      
      // Check for conflicts unless explicitly skipped
      if (!options.skipConflictCheck) {
        const conflicts = await checkAppointmentConflicts(appointmentData);
        const blockingConflicts = conflicts.filter(c => c.severity === 'Error' && !c.canOverride);
        
        if (blockingConflicts.length > 0) {
          throw new Error(`Conflitos detectados: ${blockingConflicts.map(c => c.description).join(', ')}`);
        }
      }
      
      const insertData = {
        patient_id: appointmentData.patientId,
        appointment_date: appointmentData.date.toISOString().split('T')[0],
        appointment_time: appointmentData.time,
        duration: appointmentData.duration,
        type: appointmentData.type,
        status: appointmentData.status,
        notes: appointmentData.notes || null,
        therapist_id: appointmentData.therapistId || null,
        room_id: appointmentData.roomId || null,
        equipment: appointmentData.equipment || [],
        recurrence_id: appointmentData.recurrenceId || null,
        is_recurring: appointmentData.isRecurring || false,
        recurrence_pattern: appointmentData.recurrencePattern ? 
          JSON.stringify(appointmentData.recurrencePattern) : null,
        priority: appointmentData.priority || 'Normal',
        special_requirements: appointmentData.specialRequirements || null,
        preferred_time: appointmentData.preferredTime || null,
        preferred_days: appointmentData.preferredDays ? 
          JSON.stringify(appointmentData.preferredDays) : null,
        color: appointmentData.color || getDefaultColor(appointmentData.type),
      };
      
      const { data, error } = await supabase
        .from('appointments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      
      // Create recurring appointments if requested
      if (options.createRecurring && appointmentData.recurrencePattern) {
        await createRecurringAppointments(data.id, appointmentData);
      }

      await fetchAppointments();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar agendamento');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [fetchAppointments]);

  const updateAppointment = useCallback(async (
    id: string, 
    updates: Partial<EnhancedAppointment>,
    options: { skipConflictCheck?: boolean; updateRecurring?: boolean } = {}
  ) => {
    try {
      setSyncing(true);
      
      // Check for conflicts if appointment time/date/therapist/room is being changed
      if (!options.skipConflictCheck && (updates.date || updates.time || updates.therapistId || updates.roomId)) {
        const currentAppointment = appointments.find(apt => apt.id === id);
        if (currentAppointment) {
          const updatedAppointment = { ...currentAppointment, ...updates };
          const conflicts = await checkAppointmentConflicts(updatedAppointment, id);
          const blockingConflicts = conflicts.filter(c => c.severity === 'Error' && !c.canOverride);
          
          if (blockingConflicts.length > 0) {
            throw new Error(`Conflitos detectados: ${blockingConflicts.map(c => c.description).join(', ')}`);
          }
        }
      }
      
      const updateData: Record<string, unknown> = {};
      
      if (updates.patientId) updateData.patient_id = updates.patientId;
      if (updates.date) updateData.appointment_date = updates.date.toISOString().split('T')[0];
      if (updates.time) updateData.appointment_time = updates.time;
      if (updates.duration) updateData.duration = updates.duration;
      if (updates.type) updateData.type = updates.type;
      if (updates.status) updateData.status = updates.status;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.therapistId !== undefined) updateData.therapist_id = updates.therapistId;
      if (updates.roomId !== undefined) updateData.room_id = updates.roomId;
      if (updates.equipment) updateData.equipment = updates.equipment;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.specialRequirements !== undefined) updateData.special_requirements = updates.specialRequirements;
      if (updates.reminderSent !== undefined) updateData.reminder_sent = updates.reminderSent;
      if (updates.confirmationSent !== undefined) updateData.confirmation_sent = updates.confirmationSent;
      if (updates.lastReminderSent) updateData.last_reminder_sent = updates.lastReminderSent.toISOString();
      if (updates.cancellationReason !== undefined) updateData.cancellation_reason = updates.cancellationReason;
      if (updates.cancellationTimestamp) updateData.cancellation_timestamp = updates.cancellationTimestamp.toISOString();
      if (updates.color) updateData.color = updates.color;
      if (updates.recurrencePattern !== undefined) {
        updateData.recurrence_pattern = updates.recurrencePattern ? 
          JSON.stringify(updates.recurrencePattern) : null;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      
      // Update recurring appointments if requested
      if (options.updateRecurring) {
        const appointment = appointments.find(apt => apt.id === id);
        if (appointment?.recurrenceId) {
          await updateRecurringAppointments(appointment.recurrenceId, updates);
        }
      }

      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar agendamento');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [appointments, fetchAppointments]);

  const deleteAppointment = useCallback(async (
    id: string, 
    options: { deleteRecurring?: boolean; reason?: string } = {}
  ) => {
    try {
      setSyncing(true);
      
      const appointment = appointments.find(apt => apt.id === id);
      
      // If deleting recurring appointments
      if (options.deleteRecurring && appointment?.recurrenceId) {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('recurrence_id', appointment.recurrenceId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', id);

        if (error) throw error;
      }
      
      // Log cancellation if reason provided
      if (options.reason && appointment) {
        await logAppointmentAction(appointment, 'cancelled', {
          reason: options.reason,
          timestamp: new Date()
        });
      }

      await fetchAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir agendamento');
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [appointments, fetchAppointments]);

  const getAppointment = useCallback((id: string) => {
    return appointments.find(appointment => appointment.id === id);
  }, [appointments]);
  
  const getAppointmentsByPatient = useCallback((patientId: string) => {
    return appointments.filter(appointment => appointment.patientId === patientId);
  }, [appointments]);
  
  const getAppointmentsByDate = useCallback((date: Date) => {
    const targetDate = format(date, 'yyyy-MM-dd');
    return appointments.filter(appointment => 
      format(appointment.date, 'yyyy-MM-dd') === targetDate
    );
  }, [appointments]);
  
  const getAppointmentsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = startOfDay(appointment.date);
      return appointmentDate >= startOfDay(startDate) && appointmentDate <= startOfDay(endDate);
    });
  }, [appointments]);
  
  const getAppointmentsByTherapist = useCallback((therapistId: string) => {
    return appointments.filter(appointment => appointment.therapistId === therapistId);
  }, [appointments]);
  
  const getAppointmentsByStatus = useCallback((status: EnhancedAppointment['status']) => {
    return appointments.filter(appointment => appointment.status === status);
  }, [appointments]);
  
  const getConflictingAppointments = useCallback((appointment: Partial<EnhancedAppointment>, excludeId?: string) => {
    if (!appointment.date || !appointment.time || !appointment.duration) {
      return [];
    }
    
    const appointmentStart = new Date(`${format(appointment.date, 'yyyy-MM-dd')}T${appointment.time}`);
    const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration * 60000));
    
    return appointments.filter(existing => {
      if (excludeId && existing.id === excludeId) return false;
      
      const existingStart = new Date(`${format(existing.date, 'yyyy-MM-dd')}T${existing.time}`);
      const existingEnd = new Date(existingStart.getTime() + (existing.duration * 60000));
      
      // Check for time overlap
      const timeOverlap = appointmentStart < existingEnd && appointmentEnd > existingStart;
      if (!timeOverlap) return false;
      
      // Check for therapist conflict
      if (appointment.therapistId && appointment.therapistId === existing.therapistId) {
        return true;
      }
      
      // Check for room conflict
      if (appointment.roomId && appointment.roomId === existing.roomId) {
        return true;
      }
      
      return false;
    });
  }, [appointments]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealTime) return;
    
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments'
      }, () => {
        fetchAppointments();
      })
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [enableRealTime, fetchAppointments]);
  
  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchAppointments, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAppointments]);
  
  // Initial load
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Helper functions
  const getDefaultColor = (type: EnhancedAppointment['type']): string => {
    const colorMap = {
      'Consulta Inicial': '#10b981',
      'Fisioterapia': '#3b82f6',
      'Reavaliação': '#8b5cf6',
      'Consulta de Retorno': '#f59e0b',
      'Avaliação Funcional': '#ef4444',
      'Terapia Manual': '#06b6d4',
      'Pilates Clínico': '#84cc16',
      'RPG': '#f97316',
      'Dry Needling': '#ec4899',
      'Liberação Miofascial': '#6366f1',
    };
    return colorMap[type] || '#6b7280';
  };
  
  const detectConflicts = async (appointments: EnhancedAppointment[]): Promise<AppointmentConflict[]> => {
    const conflicts: AppointmentConflict[] = [];
    
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const apt1 = appointments[i];
        const apt2 = appointments[j];
        
        // Check if appointments overlap
        const start1 = new Date(`${format(apt1.date, 'yyyy-MM-dd')}T${apt1.time}`);
        const end1 = new Date(start1.getTime() + (apt1.duration * 60000));
        const start2 = new Date(`${format(apt2.date, 'yyyy-MM-dd')}T${apt2.time}`);
        const end2 = new Date(start2.getTime() + (apt2.duration * 60000));
        
        if (start1 < end2 && start2 < end1) {
          // Time overlap detected
          if (apt1.therapistId === apt2.therapistId) {
            conflicts.push({
              type: 'Double Booking',
              description: `Therapist ${apt1.therapistName} has overlapping appointments`,
              conflictingAppointment: apt2,
              severity: 'Error',
              suggestedAlternatives: [],
              canOverride: false
            });
          }
          
          if (apt1.roomId === apt2.roomId) {
            conflicts.push({
              type: 'Room Unavailable',
              description: `Room ${apt1.roomName} is double-booked`,
              conflictingAppointment: apt2,
              severity: 'Error',
              suggestedAlternatives: [],
              canOverride: false
            });
          }
        }
      }
    }
    
    return conflicts;
  };
  
  const checkAppointmentConflicts = async (
    appointment: Partial<EnhancedAppointment>,
    excludeId?: string
  ): Promise<AppointmentConflict[]> => {
    const conflicts: AppointmentConflict[] = [];
    const conflicting = getConflictingAppointments(appointment, excludeId);
    
    for (const conflictingApt of conflicting) {
      if (appointment.therapistId === conflictingApt.therapistId) {
        conflicts.push({
          type: 'Double Booking',
          description: `Therapist ${conflictingApt.therapistName} already has an appointment at this time`,
          conflictingAppointment: conflictingApt,
          severity: 'Error',
          suggestedAlternatives: await findAlternativeSlots(appointment),
          canOverride: false
        });
      }
      
      if (appointment.roomId === conflictingApt.roomId) {
        conflicts.push({
          type: 'Room Unavailable',
          description: `Room ${conflictingApt.roomName} is already booked at this time`,
          conflictingAppointment: conflictingApt,
          severity: 'Error',
          suggestedAlternatives: await findAlternativeSlots(appointment),
          canOverride: false
        });
      }
    }
    
    return conflicts;
  };
  
  const findAlternativeSlots = async (
    appointment: Partial<EnhancedAppointment>
  ): Promise<AlternativeSlot[]> => {
    // Implement logic to find alternative time slots
    // This is a simplified version - in a real app, you'd consider working hours,
    // therapist availability, room availability, etc.
    const alternatives: AlternativeSlot[] = [];
    
    if (!appointment.date || !appointment.time || !appointment.duration) {
      return alternatives;
    }
    
    const baseDate = appointment.date;
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    
    for (const time of timeSlots) {
      if (time === appointment.time) continue;
      
      const testAppointment = { ...appointment, time };
      const conflicts = getConflictingAppointments(testAppointment);
      
      if (conflicts.length === 0) {
        alternatives.push({
          date: baseDate,
          startTime: time,
          therapistId: appointment.therapistId,
          therapistName: appointment.therapistName,
          roomId: appointment.roomId,
          roomName: appointment.roomName,
          score: 90, // Base score, can be calculated based on patient preferences
          reason: 'Same day alternative'
        });
      }
    }
    
    return alternatives.slice(0, 3); // Return top 3 alternatives
  };
  
  const createRecurringAppointments = async (
    baseAppointmentId: string,
    appointmentData: Partial<EnhancedAppointment>
  ) => {
    if (!appointmentData.recurrencePattern || !appointmentData.date) return;
    
    const pattern = appointmentData.recurrencePattern;
    const appointments = [];
    let currentDate = new Date(appointmentData.date);
    let count = 0;
    
    while (count < (pattern.maxOccurrences || 52)) { // Default max 52 occurrences
      if (pattern.endDate && currentDate > pattern.endDate) break;
      
      // Skip excluded dates
      if (pattern.excludedDates?.some(excluded => 
        format(excluded, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
      )) {
        currentDate = getNextRecurrenceDate(currentDate, pattern);
        continue;
      }
      
      if (count > 0) { // Skip the first occurrence as it's already created
        appointments.push({
          ...appointmentData,
          date: new Date(currentDate),
          recurrence_id: baseAppointmentId,
          is_recurring: true
        });
      }
      
      currentDate = getNextRecurrenceDate(currentDate, pattern);
      count++;
    }
    
    if (appointments.length > 0) {
      await supabase.from('appointments').insert(appointments);
    }
  };
  
  const getNextRecurrenceDate = (date: Date, pattern: RecurrencePattern): Date => {
    switch (pattern.type) {
      case 'Daily':
        return addDays(date, pattern.frequency);
      case 'Weekly':
        return addDays(date, pattern.frequency * 7);
      case 'Monthly':
        const nextMonth = new Date(date);
        nextMonth.setMonth(nextMonth.getMonth() + pattern.frequency);
        return nextMonth;
      default:
        return addDays(date, pattern.frequency);
    }
  };
  
  const updateRecurringAppointments = async (
    recurrenceId: string,
    updates: Partial<EnhancedAppointment>
  ) => {
    const updateData: Record<string, unknown> = {};
    
    // Only allow certain fields to be updated for recurring appointments
    if (updates.status) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.therapistId !== undefined) updateData.therapist_id = updates.therapistId;
    if (updates.roomId !== undefined) updateData.room_id = updates.roomId;
    
    await supabase
      .from('appointments')
      .update(updateData)
      .eq('recurrence_id', recurrenceId);
  };
  
  const logAppointmentAction = async (
    appointment: EnhancedAppointment,
    action: string,
    metadata: Record<string, unknown>
  ) => {
    // Log important appointment actions for audit trail
    await supabase.from('appointment_logs').insert({
      appointment_id: appointment.id,
      action,
      metadata: JSON.stringify(metadata),
      timestamp: new Date().toISOString()
    });
  };
  
  // Statistics
  const statistics = useMemo((): AppointmentStatistics => {
    const total = appointments.length;
    const confirmed = appointments.filter(apt => apt.status === 'Confirmed').length;
    const cancelled = appointments.filter(apt => apt.status === 'Cancelled').length;
    const noShow = appointments.filter(apt => apt.status === 'No Show').length;
    const completed = appointments.filter(apt => apt.status === 'Completed').length;
    
    const totalDuration = appointments.reduce((sum, apt) => sum + apt.duration, 0);
    const averageDuration = total > 0 ? totalDuration / total : 0;
    
    const typeStats = appointments.reduce((acc, apt) => {
      acc[apt.type] = (acc[apt.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonTypes = Object.entries(typeStats)
      .map(([type, count]) => ({
        type: type as EnhancedAppointment['type'],
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    const therapistStats = appointments.reduce((acc, apt) => {
      if (apt.therapistId) {
        const existing = acc.find(t => t.therapistId === apt.therapistId);
        if (existing) {
          existing.appointmentCount++;
        } else {
          acc.push({
            therapistId: apt.therapistId,
            therapistName: apt.therapistName || 'Unknown',
            appointmentCount: 1,
            utilizationRate: 0 // Would need working hours data to calculate properly
          });
        }
      }
      return acc;
    }, [] as AppointmentStatistics['therapistStats']);
    
    return {
      totalAppointments: total,
      confirmedAppointments: confirmed,
      cancelledAppointments: cancelled,
      noShowAppointments: noShow,
      completedAppointments: completed,
      averageDuration,
      utilizationRate: total > 0 ? (completed / total) * 100 : 0,
      mostCommonTypes,
      therapistStats,
      timeSlotStats: [] // Would need more complex calculation
    };
  }, [appointments]);
  
  const rescheduleAppointment = useCallback(async (
    appointmentId: string,
    newDate: Date,
    newTime: string,
    reason?: string
  ) => {
    const appointment = getAppointment(appointmentId);
    if (!appointment) throw new Error('Appointment not found');
    
    // Create rescheduled appointment
    const rescheduledData = {
      ...appointment,
      date: newDate,
      time: newTime,
      status: 'Scheduled' as const,
      rescheduledFromId: appointmentId,
      notes: `Reagendado de ${format(appointment.date, 'dd/MM/yyyy')} ${appointment.time}${reason ? ` - Motivo: ${reason}` : ''}`
    };
    
    const newAppointment = await addAppointment(rescheduledData);
    
    // Update original appointment
    await updateAppointment(appointmentId, {
      status: 'Rescheduled',
      rescheduledToId: newAppointment.id,
      cancellationReason: reason,
      cancellationTimestamp: new Date()
    });
    
    return newAppointment;
  }, [getAppointment, addAppointment, updateAppointment]);
  
  const cancelAppointment = useCallback(async (
    appointmentId: string,
    reason?: string,
    notifyPatient: boolean = true
  ) => {
    await updateAppointment(appointmentId, {
      status: 'Cancelled',
      cancellationReason: reason,
      cancellationTimestamp: new Date()
    });
    
    if (notifyPatient) {
      const appointment = getAppointment(appointmentId);
      if (appointment) {
        // Send cancellation notification
        // This would integrate with your notification system
      }
    }
  }, [updateAppointment, getAppointment]);
  
  const confirmAppointment = useCallback(async (appointmentId: string) => {
    await updateAppointment(appointmentId, {
      status: 'Confirmed',
      confirmationSent: true
    });
  }, [updateAppointment]);
  
  const markAsCompleted = useCallback(async (appointmentId: string, notes?: string) => {
    await updateAppointment(appointmentId, {
      status: 'Completed',
      notes: notes || undefined
    });
  }, [updateAppointment]);
  
  const markAsNoShow = useCallback(async (appointmentId: string, reason?: string) => {
    await updateAppointment(appointmentId, {
      status: 'No Show',
      cancellationReason: reason
    });
  }, [updateAppointment]);
  
  const filterAppointments = useCallback((filters: AppointmentFilters) => {
    return appointments.filter(appointment => {
      if (filters.dateRange) {
        const appointmentDate = startOfDay(appointment.date);
        if (appointmentDate < startOfDay(filters.dateRange.start) || 
            appointmentDate > startOfDay(filters.dateRange.end)) {
          return false;
        }
      }
      
      if (filters.status && !filters.status.includes(appointment.status)) {
        return false;
      }
      
      if (filters.type && !filters.type.includes(appointment.type)) {
        return false;
      }
      
      if (filters.therapistId && !filters.therapistId.includes(appointment.therapistId || '')) {
        return false;
      }
      
      if (filters.patientId && !filters.patientId.includes(appointment.patientId)) {
        return false;
      }
      
      if (filters.priority && !filters.priority.includes(appointment.priority)) {
        return false;
      }
      
      if (filters.roomId && !filters.roomId.includes(appointment.roomId || '')) {
        return false;
      }
      
      return true;
    });
  }, [appointments]);
  
  return {
    // Core data
    appointments,
    loading,
    error,
    syncing,
    conflicts,
    statistics,
    
    // CRUD operations
    addAppointment,
    updateAppointment,
    deleteAppointment,
    
    // Getters
    getAppointment,
    getAppointmentsByPatient,
    getAppointmentsByDate,
    getAppointmentsByDateRange,
    getAppointmentsByTherapist,
    getAppointmentsByStatus,
    getConflictingAppointments,
    
    // Advanced operations
    rescheduleAppointment,
    cancelAppointment,
    confirmAppointment,
    markAsCompleted,
    markAsNoShow,
    
    // Conflict management
    checkAppointmentConflicts,
    findAlternativeSlots,
    
    // Filtering
    filterAppointments,
    
    // Utilities
    refetch: fetchAppointments,
  };
}