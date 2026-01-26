"use strict";
/**
 * Appointment Workflows - Firebase Cloud Functions
 *
 * Substitui workflows do Inngest:
 * - appointmentReminderWorkflow → Scheduled Function
 * - appointmentCreatedWorkflow → Firestore Trigger
 *
 * @version 1.0.0 - Firebase Functions v2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAppointmentUpdatedWorkflow = exports.onAppointmentCreatedWorkflow = exports.appointmentReminders = void 0;
exports.getAppointmentsWithRelations = getAppointmentsWithRelations;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const init_1 = require("../init");
// ============================================================================
// SCHEDULED FUNCTION: Appointment Reminders
// ============================================================================
/**
 * Send Appointment Reminders
 * Runs daily at 08:00 to send reminders for appointments the next day
 *
 * Schedule: "every day 08:00"
 */
exports.appointmentReminders = (0, scheduler_1.onSchedule)({
    schedule: 'every day 08:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, async (event) => {
    const db = (0, init_1.getAdminDb)();
    firebase_functions_1.logger.info('[appointmentReminders] Starting appointment reminder check', {
        jobName: 'appointmentReminders',
        scheduleTime: event.scheduleTime,
    });
    try {
        // Get appointments for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        const snapshot = await db
            .collection('appointments')
            .where('status', '==', 'agendado')
            .where('date', '>=', tomorrow.toISOString())
            .where('date', '<', dayAfter.toISOString())
            .get();
        if (snapshot.empty) {
            firebase_functions_1.logger.info('[appointmentReminders] No appointments found for tomorrow');
            void {
                success: true,
                remindersSent: 0,
                timestamp: new Date().toISOString(),
            };
            return;
        }
        firebase_functions_1.logger.info('[appointmentReminders] Appointments found', {
            count: snapshot.docs.length,
        });
        // Batch fetch related data
        const patientIds = snapshot.docs.map((doc) => doc.data().patient_id).filter(Boolean);
        const orgIds = snapshot.docs.map((doc) => doc.data().organization_id).filter(Boolean);
        const [patientMap, orgMap] = await Promise.all([
            (0, init_1.batchFetchDocuments)('patients', patientIds),
            (0, init_1.batchFetchDocuments)('organizations', orgIds),
        ]);
        // Process each appointment
        let remindersSent = 0;
        const results = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const appointment = { id: docSnap.id, ...docSnap.data() };
            const patient = patientMap.get(appointment.patient_id) || {
                id: appointment.patient_id,
                full_name: 'Unknown',
                name: 'Unknown',
            };
            const organization = orgMap.get(appointment.organization_id) || {
                id: appointment.organization_id,
                name: 'Unknown',
            };
            const preferences = patient.notification_preferences || {};
            const orgSettings = organization?.settings || {};
            try {
                // Check if reminder already sent
                const reminderSnapshot = await db
                    .collection('appointment_reminders')
                    .where('appointment_id', '==', appointment.id)
                    .where('reminder_type', '==', 'day_before')
                    .limit(1)
                    .get();
                if (!reminderSnapshot.empty) {
                    firebase_functions_1.logger.info('[appointmentReminders] Reminder already sent', {
                        appointmentId: appointment.id,
                    });
                    return {
                        appointmentId: appointment.id,
                        sent: false,
                        reason: 'Already sent',
                    };
                }
                // Send email reminder
                if (preferences.email !== false && orgSettings.email_enabled && patient.email) {
                    firebase_functions_1.logger.info('[appointmentReminders] Queuing email reminder', {
                        appointmentId: appointment.id,
                        patientEmail: patient.email,
                    });
                    // TODO: Send via email provider
                    remindersSent++;
                }
                // Send WhatsApp reminder
                if (preferences.whatsapp !== false &&
                    orgSettings.whatsapp_enabled &&
                    patient.phone) {
                    firebase_functions_1.logger.info('[appointmentReminders] Queuing WhatsApp reminder', {
                        appointmentId: appointment.id,
                        patientPhone: patient.phone,
                    });
                    // TODO: Send via WhatsApp provider
                    remindersSent++;
                }
                // Log reminder sent
                const reminderRef = db.collection('appointment_reminders').doc();
                await reminderRef.create({
                    appointment_id: appointment.id,
                    patient_id: patient.id,
                    organization_id: organization.id,
                    reminder_type: 'day_before',
                    sent_at: new Date().toISOString(),
                    channels: {
                        email: !!(preferences.email !== false && orgSettings.email_enabled && patient.email),
                        whatsapp: !!(preferences.whatsapp !== false &&
                            orgSettings.whatsapp_enabled &&
                            patient.phone),
                    },
                });
                return {
                    appointmentId: appointment.id,
                    patientId: patient.id,
                    sent: true,
                };
            }
            catch (error) {
                firebase_functions_1.logger.error('[appointmentReminders] Error processing appointment', {
                    appointmentId: appointment.id,
                    error,
                });
                return {
                    appointmentId: appointment.id,
                    sent: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }));
        firebase_functions_1.logger.info('[appointmentReminders] Completed', {
            remindersSent,
            totalAppointments: snapshot.docs.length,
        });
        void {
            success: true,
            remindersSent,
            totalAppointments: snapshot.docs.length,
            timestamp: new Date().toISOString(),
            results,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('[appointmentReminders] Fatal error', { error });
        throw error;
    }
});
// ============================================================================
// FIRESTORE TRIGGER: Appointment Created
// ============================================================================
/**
 * Handle Appointment Created
 * Triggered when a new appointment is created in Firestore
 *
 * Actions:
 * - Send confirmation message to patient
 * - Invalidate caches
 */
exports.onAppointmentCreatedWorkflow = (0, firestore_1.onDocumentCreated)('appointments/{appointmentId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const appointment = { id: snapshot.id, ...snapshot.data() };
    const db = (0, init_1.getAdminDb)();
    firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Processing new appointment', {
        appointmentId: appointment.id,
    });
    try {
        // Fetch related data
        const [patientSnap, orgSnap] = await Promise.all([
            db.collection('patients').doc(appointment.patient_id).get(),
            db.collection('organizations').doc(appointment.organization_id).get(),
        ]);
        if (!patientSnap.exists) {
            firebase_functions_1.logger.warn('[onAppointmentCreatedWorkflow] Patient not found', {
                patientId: appointment.patient_id,
            });
            return;
        }
        const patient = { id: patientSnap.id, ...patientSnap.data() };
        const organization = orgSnap.exists
            ? { id: orgSnap.id, ...orgSnap.data() }
            : null;
        // Check preferences
        const whatsappEnabled = organization?.settings?.whatsapp_enabled ?? true;
        if (whatsappEnabled && patient.phone) {
            // TODO: Send WhatsApp confirmation
            firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Queuing WhatsApp confirmation', {
                patientPhone: patient.phone,
                appointmentDate: appointment.date,
            });
            // Create confirmation log
            const confirmationRef = db.collection('appointment_confirmations').doc();
            await confirmationRef.create({
                appointment_id: appointment.id,
                patient_id: patient.id,
                organization_id: organization?.id,
                sent_at: new Date().toISOString(),
                channel: 'whatsapp',
            });
        }
        // Invalidate cache (if using KV cache)
        // TODO: Implement cache invalidation
        firebase_functions_1.logger.info('[onAppointmentCreatedWorkflow] Processed successfully', {
            appointmentId: appointment.id,
        });
        return {
            success: true,
            appointmentId: appointment.id,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('[onAppointmentCreatedWorkflow] Error', {
            appointmentId: appointment.id,
            error,
        });
        return {
            success: false,
            appointmentId: appointment.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
});
// ============================================================================
// FIRESTORE TRIGGER: Appointment Updated (for feedback workflow)
// ============================================================================
/**
 * Handle Appointment Updated
 * Triggered when an appointment is updated
 * Used to trigger feedback request when appointment is completed
 */
exports.onAppointmentUpdatedWorkflow = (0, firestore_1.onDocumentUpdated)('appointments/{appointmentId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    // Check if status changed to completed
    const completedStatuses = ['concluido', 'realizado', 'attended', 'completed'];
    const isCompleted = completedStatuses.includes(after.status?.toLowerCase());
    const wasCompleted = completedStatuses.includes(before.status?.toLowerCase());
    if (!isCompleted || wasCompleted) {
        return;
    }
    const appointmentId = event.params.appointmentId;
    const db = (0, init_1.getAdminDb)();
    firebase_functions_1.logger.info('[onAppointmentUpdatedWorkflow] Appointment completed, scheduling feedback', {
        appointmentId,
    });
    // Create a "delayed" feedback task
    // In production, use Cloud Tasks with scheduleTime
    const feedbackRef = db.collection('feedback_tasks').doc();
    await feedbackRef.create({
        appointment_id: appointmentId,
        patient_id: after.patient_id,
        organization_id: after.organization_id,
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
        status: 'pending',
        created_at: new Date().toISOString(),
    });
    firebase_functions_1.logger.info('[onAppointmentUpdatedWorkflow] Feedback task created', {
        appointmentId,
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    return {
        success: true,
        feedbackScheduled: true,
    };
});
// ============================================================================
// HELPER FUNCTION: Get Appointments with Relations
// ============================================================================
async function getAppointmentsWithRelations(startDate, endDate) {
    const db = (0, init_1.getAdminDb)();
    const snapshot = await db
        .collection('appointments')
        .where('status', '==', 'agendado')
        .where('date', '>=', startDate.toISOString())
        .where('date', '<', endDate.toISOString())
        .get();
    if (snapshot.empty) {
        return [];
    }
    const patientIds = snapshot.docs.map((doc) => doc.data().patient_id).filter(Boolean);
    const orgIds = snapshot.docs.map((doc) => doc.data().organization_id).filter(Boolean);
    const [patientMap, orgMap] = await Promise.all([
        (0, init_1.batchFetchDocuments)('patients', patientIds),
        (0, init_1.batchFetchDocuments)('organizations', orgIds),
    ]);
    const appointments = [];
    for (const docSnap of snapshot.docs) {
        const appointment = { id: docSnap.id, ...docSnap.data() };
        appointments.push({
            id: appointment.id,
            date: appointment.date,
            time: appointment.time,
            patient_id: appointment.patient_id,
            organization_id: appointment.organization_id,
            patient: patientMap.get(appointment.patient_id) || {
                id: appointment.patient_id,
                full_name: 'Unknown',
                name: 'Unknown',
            },
            organization: orgMap.get(appointment.organization_id) || {
                id: appointment.organization_id,
                name: 'Unknown',
            },
        });
    }
    return appointments;
}
//# sourceMappingURL=appointments.js.map