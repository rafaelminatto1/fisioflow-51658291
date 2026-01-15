import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client - cria um mock encadeado que suporta ambos os padrões
function createMockChain() {
  const mock = vi.fn()
  mock.single = vi.fn()
  mock.eq = vi.fn(() => mock)
  mock.select = vi.fn(() => mock)
  mock.insert = vi.fn(() => mock)
  mock.update = vi.fn(() => mock)
  mock.gte = vi.fn(() => mock)
  mock.lte = vi.fn(() => mock)
  return mock
}

const mockSupabaseClient = {
  from: vi.fn(() => createMockChain()),
  rpc: vi.fn()
}

// Mock cron parser
const mockCronParser = {
  parseExpression: vi.fn()
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient
}))

vi.mock('cron-parser', () => mockCronParser)

describe('Schedule Notifications Edge Function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scheduleAppointmentReminders', () => {
    it('should schedule 24-hour and 2-hour reminders for new appointments', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          patient_id: 'patient-1',
          therapist_id: 'therapist-1',
          scheduled_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // 25 hours from now
          status: 'scheduled',
          patient: { name: 'João Silva' },
          therapist: { name: 'Dr. Maria Santos' }
        },
        {
          id: 'apt-2',
          patient_id: 'patient-2',
          therapist_id: 'therapist-1',
          scheduled_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
          status: 'scheduled',
          patient: { name: 'Ana Costa' },
          therapist: { name: 'Dr. Maria Santos' }
        }
      ]

      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: mockAppointments,
        error: null
      })

      // Mock existing scheduled notifications check
      mockSupabaseClient.from().select().eq().is().mockResolvedValue({
        data: [],
        error: null
      })

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: [{ id: 'sched-1' }, { id: 'sched-2' }],
        error: null
      })

      const { scheduleAppointmentReminders } = await import('../schedule-notifications/index.ts')
      
      const result = await scheduleAppointmentReminders()

      expect(result.success).toBe(true)
      expect(result.scheduled).toBe(3) // 2 reminders for apt-1, 1 for apt-2 (only 2-hour)
      
      // Should insert scheduled notifications
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'appointment_reminder_24h',
            user_id: 'patient-1',
            scheduled_for: expect.any(String)
          }),
          expect.objectContaining({
            type: 'appointment_reminder_2h',
            user_id: 'patient-1',
            scheduled_for: expect.any(String)
          }),
          expect.objectContaining({
            type: 'appointment_reminder_2h',
            user_id: 'patient-2',
            scheduled_for: expect.any(String)
          })
        ])
      )
    })

    it('should not schedule duplicate reminders', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          patient_id: 'patient-1',
          therapist_id: 'therapist-1',
          scheduled_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          patient: { name: 'João Silva' },
          therapist: { name: 'Dr. Maria Santos' }
        }
      ]

      const existingNotifications = [
        {
          id: 'existing-1',
          type: 'appointment_reminder_24h',
          reference_id: 'apt-1',
          user_id: 'patient-1'
        }
      ]

      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: mockAppointments,
        error: null
      })

      mockSupabaseClient.from().select().eq().is().mockResolvedValue({
        data: existingNotifications,
        error: null
      })

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: [{ id: 'sched-1' }],
        error: null
      })

      const { scheduleAppointmentReminders } = await import('../schedule-notifications/index.ts')
      
      const result = await scheduleAppointmentReminders()

      expect(result.success).toBe(true)
      expect(result.scheduled).toBe(1) // Only 2-hour reminder, 24-hour already exists
    })

    it('should handle appointments too close to schedule reminders', async () => {
      const mockAppointments = [
        {
          id: 'apt-1',
          patient_id: 'patient-1',
          therapist_id: 'therapist-1',
          scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          status: 'scheduled',
          patient: { name: 'João Silva' },
          therapist: { name: 'Dr. Maria Santos' }
        }
      ]

      mockSupabaseClient.from().select().eq().gte().lte().mockResolvedValue({
        data: mockAppointments,
        error: null
      })

      mockSupabaseClient.from().select().eq().is().mockResolvedValue({
        data: [],
        error: null
      })

      const { scheduleAppointmentReminders } = await import('../schedule-notifications/index.ts')
      
      const result = await scheduleAppointmentReminders()

      expect(result.success).toBe(true)
      expect(result.scheduled).toBe(0) // No reminders scheduled (too close)
      expect(result.skipped).toBe(1)
    })
  })

  describe('scheduleExerciseReminders', () => {
    it('should schedule recurring exercise reminders', async () => {
      const mockPrescriptions = [
        {
          id: 'pres-1',
          patient_id: 'patient-1',
          exercise_id: 'ex-1',
          frequency: 'daily',
          times_per_day: 2,
          duration_weeks: 4,
          start_date: new Date().toISOString(),
          reminder_times: ['09:00', '18:00'],
          patient: { name: 'João Silva' },
          exercise: { name: 'Alongamento Cervical' }
        },
        {
          id: 'pres-2',
          patient_id: 'patient-2',
          exercise_id: 'ex-2',
          frequency: 'every_other_day',
          times_per_day: 1,
          duration_weeks: 2,
          start_date: new Date().toISOString(),
          reminder_times: ['14:00'],
          patient: { name: 'Ana Costa' },
          exercise: { name: 'Fortalecimento Lombar' }
        }
      ]

      mockSupabaseClient.from().select().eq().gte().mockResolvedValue({
        data: mockPrescriptions,
        error: null
      })

      mockSupabaseClient.from().select().eq().is().mockResolvedValue({
        data: [],
        error: null
      })

      mockSupabaseClient.from().insert().mockResolvedValue({
        data: Array.from({ length: 10 }, (_, i) => ({ id: `sched-${i}` })),
        error: null
      })

      const { scheduleExerciseReminders } = await import('../schedule-notifications/index.ts')
      
      const result = await scheduleExerciseReminders()

      expect(result.success).toBe(true)
      expect(result.scheduled).toBeGreaterThan(0)
      
      // Should schedule multiple reminders based on frequency and duration
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'exercise_reminder',
            user_id: 'patient-1',
            reference_id: 'pres-1'
          })
        ])
      )
    })

    it('should handle different exercise frequencies', async () => {
      const frequencies = [
        { frequency: 'daily', expectedDays: 7 },
        { frequency: 'every_other_day', expectedDays: 4 },
        { frequency: 'weekly', expectedDays: 1 },
        { frequency: 'twice_weekly', expectedDays: 2 }
      ]

      for (const { frequency, expectedDays } of frequencies) {
        const mockPrescription = {
          id: 'pres-1',
          patient_id: 'patient-1',
          exercise_id: 'ex-1',
          frequency,
          times_per_day: 1,
          duration_weeks: 1,
          start_date: new Date().toISOString(),
          reminder_times: ['09:00'],
          patient: { name: 'João Silva' },
          exercise: { name: 'Test Exercise' }
        }

        mockSupabaseClient.from().select().eq().gte().mockResolvedValue({
          data: [mockPrescription],
          error: null
        })

        const { calculateExerciseSchedule } = await import('../schedule-notifications/index.ts')
        
        const schedule = calculateExerciseSchedule(mockPrescription)
        
        expect(schedule).toHaveLength(expectedDays)
      }
    })
  })

  describe('processScheduledNotifications', () => {
    it('should send due notifications', async () => {
      const now = new Date()
      const mockScheduledNotifications = [
        {
          id: 'sched-1',
          type: 'appointment_reminder_24h',
          user_id: 'patient-1',
          title: 'Lembrete de Consulta',
          body: 'Você tem uma consulta amanhã às 14:00',
          data: { appointmentId: 'apt-1' },
          scheduled_for: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          sent_at: null,
          status: 'pending'
        },
        {
          id: 'sched-2',
          type: 'exercise_reminder',
          user_id: 'patient-2',
          title: 'Hora dos Exercícios',
          body: 'Não esqueça de fazer seus exercícios',
          data: { prescriptionId: 'pres-1' },
          scheduled_for: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          sent_at: null,
          status: 'pending'
        }
      ]

      mockSupabaseClient.from().select().eq().lte().is().mockResolvedValue({
        data: [mockScheduledNotifications[0]], // Only the due notification
        error: null
      })

      // Mock send notification function
      const mockSendNotification = vi.fn().mockResolvedValue({ success: true })
      vi.doMock('../send-notification/index.ts', () => ({
        sendNotification: mockSendNotification
      }))

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: [{ id: 'sched-1' }],
        error: null
      })

      const { processScheduledNotifications } = await import('../schedule-notifications/index.ts')
      
      const result = await processScheduledNotifications()

      expect(result.success).toBe(true)
      expect(result.processed).toBe(1)
      expect(mockSendNotification).toHaveBeenCalledWith('patient-1', {
        type: 'appointment_reminder_24h',
        title: 'Lembrete de Consulta',
        body: 'Você tem uma consulta amanhã às 14:00',
        data: { appointmentId: 'apt-1' }
      })
    })

    it('should handle notification send failures', async () => {
      const mockScheduledNotifications = [
        {
          id: 'sched-1',
          type: 'appointment_reminder_24h',
          user_id: 'patient-1',
          title: 'Lembrete de Consulta',
          body: 'Você tem uma consulta amanhã às 14:00',
          data: { appointmentId: 'apt-1' },
          scheduled_for: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          sent_at: null,
          status: 'pending',
          retry_count: 0
        }
      ]

      mockSupabaseClient.from().select().eq().lte().is().mockResolvedValue({
        data: mockScheduledNotifications,
        error: null
      })

      // Mock send notification failure
      const mockSendNotification = vi.fn().mockResolvedValue({ 
        success: false, 
        error: 'Push service error' 
      })
      vi.doMock('../send-notification/index.ts', () => ({
        sendNotification: mockSendNotification
      }))

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: [{ id: 'sched-1' }],
        error: null
      })

      const { processScheduledNotifications } = await import('../schedule-notifications/index.ts')
      
      const result = await processScheduledNotifications()

      expect(result.success).toBe(true)
      expect(result.failed).toBe(1)
      
      // Should update with error status and increment retry count
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'failed',
        error_message: 'Push service error',
        retry_count: 1,
        last_attempt_at: expect.any(String)
      })
    })

    it('should retry failed notifications with exponential backoff', async () => {
      const mockFailedNotifications = [
        {
          id: 'sched-1',
          type: 'appointment_reminder_24h',
          user_id: 'patient-1',
          title: 'Lembrete de Consulta',
          body: 'Você tem uma consulta amanhã às 14:00',
          data: { appointmentId: 'apt-1' },
          scheduled_for: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          sent_at: null,
          status: 'failed',
          retry_count: 1,
          last_attempt_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
        }
      ]

      mockSupabaseClient.from().select().eq().lte().mockResolvedValue({
        data: mockFailedNotifications,
        error: null
      })

      const mockSendNotification = vi.fn().mockResolvedValue({ success: true })
      vi.doMock('../send-notification/index.ts', () => ({
        sendNotification: mockSendNotification
      }))

      const { retryFailedNotifications } = await import('../schedule-notifications/index.ts')
      
      const result = await retryFailedNotifications()

      expect(result.success).toBe(true)
      expect(result.retried).toBe(1)
      expect(mockSendNotification).toHaveBeenCalled()
    })

    it('should abandon notifications after max retries', async () => {
      const mockFailedNotifications = [
        {
          id: 'sched-1',
          type: 'appointment_reminder_24h',
          user_id: 'patient-1',
          title: 'Lembrete de Consulta',
          body: 'Você tem uma consulta amanhã às 14:00',
          data: { appointmentId: 'apt-1' },
          scheduled_for: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          sent_at: null,
          status: 'failed',
          retry_count: 5, // Max retries reached
          last_attempt_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ]

      mockSupabaseClient.from().select().eq().lte().mockResolvedValue({
        data: mockFailedNotifications,
        error: null
      })

      mockSupabaseClient.from().update().eq().mockResolvedValue({
        data: [{ id: 'sched-1' }],
        error: null
      })

      const { retryFailedNotifications } = await import('../schedule-notifications/index.ts')
      
      const result = await retryFailedNotifications()

      expect(result.success).toBe(true)
      expect(result.abandoned).toBe(1)
      
      // Should mark as abandoned
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'abandoned',
        abandoned_at: expect.any(String)
      })
    })
  })

  describe('HTTP handler', () => {
    it('should handle cron job request', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer cron-secret-key'
        }
      })

      // Mock all scheduling functions
      vi.doMock('../schedule-notifications/index.ts', () => ({
        scheduleAppointmentReminders: vi.fn().mockResolvedValue({ success: true, scheduled: 5 }),
        scheduleExerciseReminders: vi.fn().mockResolvedValue({ success: true, scheduled: 10 }),
        processScheduledNotifications: vi.fn().mockResolvedValue({ success: true, processed: 3 }),
        retryFailedNotifications: vi.fn().mockResolvedValue({ success: true, retried: 1 })
      }))

      const { default: handler } = await import('../schedule-notifications/index.ts')
      
      const response = await handler(mockRequest)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.summary).toBeDefined()
    })

    it('should handle unauthorized requests', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'POST'
        // Missing authorization header
      })

      const { default: handler } = await import('../schedule-notifications/index.ts')
      
      const response = await handler(mockRequest)

      expect(response.status).toBe(401)
    })

    it('should handle invalid request method', async () => {
      const mockRequest = new Request('http://localhost:3000', {
        method: 'GET'
      })

      const { default: handler } = await import('../schedule-notifications/index.ts')
      
      const response = await handler(mockRequest)

      expect(response.status).toBe(405)
    })
  })

  describe('Notification templates', () => {
    it('should generate correct appointment reminder templates', async () => {
      const appointment = {
        id: 'apt-1',
        patient_id: 'patient-1',
        therapist_id: 'therapist-1',
        scheduled_at: new Date('2024-01-15T14:00:00Z').toISOString(),
        patient: { name: 'João Silva' },
        therapist: { name: 'Dr. Maria Santos' }
      }

      const { generateAppointmentReminderTemplate } = await import('../schedule-notifications/index.ts')
      
      const template24h = generateAppointmentReminderTemplate(appointment, '24h')
      const template2h = generateAppointmentReminderTemplate(appointment, '2h')

      expect(template24h.title).toContain('Lembrete de Consulta')
      expect(template24h.body).toContain('amanhã')
      expect(template24h.data.appointmentId).toBe('apt-1')

      expect(template2h.title).toContain('Consulta em Breve')
      expect(template2h.body).toContain('2 horas')
      expect(template2h.data.appointmentId).toBe('apt-1')
    })

    it('should generate correct exercise reminder templates', async () => {
      const prescription = {
        id: 'pres-1',
        patient_id: 'patient-1',
        exercise_id: 'ex-1',
        patient: { name: 'João Silva' },
        exercise: { name: 'Alongamento Cervical', duration_minutes: 15 }
      }

      const { generateExerciseReminderTemplate } = await import('../schedule-notifications/index.ts')
      
      const template = generateExerciseReminderTemplate(prescription)

      expect(template.title).toContain('Hora dos Exercícios')
      expect(template.body).toContain('Alongamento Cervical')
      expect(template.data.prescriptionId).toBe('pres-1')
      expect(template.data.exerciseId).toBe('ex-1')
    })
  })
})