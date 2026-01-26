"use strict";
/**
 * Patient Reactivation Workflow - Firebase Cloud Functions
 *
 * Substitui workflow do Inngest:
 * - reactivationWorkflow → Scheduled Function
 *
 * Executa semanalmente (segundas-feiras às 10:00) para:
 * - Encontrar pacientes inativos (>30 dias sem consulta)
 * - Enviar mensagens de reativação via WhatsApp/Email
 *
 * @version 1.0.0 - Firebase Functions v2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerPatientReactivation = exports.patientReactivation = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const init_1 = require("../init");
// ============================================================================
// SCHEDULED FUNCTION: Weekly Patient Reactivation
// ============================================================================
/**
 * Weekly Patient Reactivation Campaign
 * Runs every Monday at 10:00 AM
 *
 * Schedule: "every monday 10:00"
 */
exports.patientReactivation = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 10:00',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
}, async (event) => {
    const db = (0, init_1.getAdminDb)();
    firebase_functions_1.logger.info('[patientReactivation] Starting weekly reactivation campaign', {
        jobName: 'patientReactivation',
        scheduleTime: event.scheduleTime,
    });
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Get active patients
        const patientsSnapshot = await db
            .collection('patients')
            .where('active', '==', true)
            .select('id', 'name', 'full_name', 'phone', 'email', 'organization_id', 'notification_preferences')
            .get();
        firebase_functions_1.logger.info('[patientReactivation] Active patients found', {
            count: patientsSnapshot.docs.length,
        });
        const inactivePatients = [];
        const now = new Date();
        // Fetch completed appointments from last 60 days (optimization)
        const appointmentsSnapshot = await db
            .collection('appointments')
            .where('status', 'in', ['concluido', 'realizado', 'attended'])
            .where('date', '>=', new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString())
            .get();
        // Create map: patientId -> latest appointment
        const latestAppointmentByPatient = new Map();
        appointmentsSnapshot.docs.forEach((doc) => {
            const appt = { id: doc.id, ...doc.data() };
            const existing = latestAppointmentByPatient.get(appt.patient_id || '');
            if (!existing || new Date(appt.date) > new Date(existing.date)) {
                latestAppointmentByPatient.set(appt.patient_id || '', { date: appt.date });
            }
        });
        // Find inactive patients (30-37 days since last appointment)
        for (const patientDoc of patientsSnapshot.docs) {
            const p = { id: patientDoc.id, ...patientDoc.data() };
            // Normalize name field
            if (!p.full_name && p.name) {
                p.full_name = p.name;
            }
            // Check notification preferences
            const prefs = p.notification_preferences || {};
            if (prefs.whatsapp === false && prefs.email === false)
                continue;
            if (!p.phone && !p.email)
                continue;
            const lastApp = latestAppointmentByPatient.get(p.id);
            if (!lastApp)
                continue; // No appointments at all
            const lastDate = new Date(lastApp.date);
            const diffTime = Math.abs(now.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // If last appointment was between 30 and 37 days ago
            if (diffDays >= 30 && diffDays <= 37) {
                inactivePatients.push(p);
            }
        }
        if (inactivePatients.length === 0) {
            firebase_functions_1.logger.info('[patientReactivation] No inactive patients found in window');
            void {
                success: true,
                processed: 0,
                timestamp: new Date().toISOString(),
                message: 'No inactive patients found in window',
            };
            return;
        }
        firebase_functions_1.logger.info('[patientReactivation] Inactive patients found', {
            count: inactivePatients.length,
        });
        // Get organization settings
        const orgIds = [...new Set(inactivePatients.map((p) => p.organization_id))];
        const orgPromises = orgIds.map((orgId) => db.collection('organizations').doc(orgId).get());
        const orgSnapshots = await Promise.all(orgPromises);
        const orgMap = new Map();
        orgSnapshots
            .filter((snap) => snap.exists)
            .forEach((snap) => {
            orgMap.set(snap.id, { id: snap.id, ...snap.data() });
        });
        // Queue reactivation messages
        let messagesQueued = 0;
        const results = await Promise.all(inactivePatients.map(async (patient) => {
            const org = orgMap.get(patient.organization_id);
            const notificationPrefs = patient.notification_preferences || {};
            const whatsappEnabled = (org?.settings?.whatsapp_enabled ?? true) && notificationPrefs.whatsapp !== false;
            const emailEnabled = (org?.settings?.email_enabled ?? true) && notificationPrefs.email !== false;
            try {
                // Queue WhatsApp message
                if (whatsappEnabled && patient.phone) {
                    firebase_functions_1.logger.info('[patientReactivation] Queuing WhatsApp reactivation', {
                        patientId: patient.id,
                        patientPhone: patient.phone,
                    });
                    // TODO: Send via WhatsApp provider
                    messagesQueued++;
                    // Log the reactivation attempt
                    const campaignRef1 = db.collection('reactivation_campaigns').doc();
                    await campaignRef1.create({
                        patient_id: patient.id,
                        organization_id: org?.id,
                        channel: 'whatsapp',
                        sent_at: new Date().toISOString(),
                        status: 'queued',
                    });
                }
                // Queue email
                if (emailEnabled && patient.email) {
                    firebase_functions_1.logger.info('[patientReactivation] Queuing email reactivation', {
                        patientId: patient.id,
                        patientEmail: patient.email,
                    });
                    // TODO: Send via email provider
                    messagesQueued++;
                    // Log the reactivation attempt
                    const campaignRef2 = db.collection('reactivation_campaigns').doc();
                    await campaignRef2.create({
                        patient_id: patient.id,
                        organization_id: org?.id,
                        channel: 'email',
                        sent_at: new Date().toISOString(),
                        status: 'queued',
                    });
                }
                return {
                    patientId: patient.id,
                    queued: true,
                    channels: {
                        whatsapp: whatsappEnabled && !!patient.phone,
                        email: emailEnabled && !!patient.email,
                    },
                };
            }
            catch (error) {
                firebase_functions_1.logger.error('[patientReactivation] Error processing patient', {
                    patientId: patient.id,
                    error,
                });
                return {
                    patientId: patient.id,
                    queued: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        }));
        firebase_functions_1.logger.info('[patientReactivation] Completed', {
            messagesQueued,
            totalPatients: inactivePatients.length,
        });
        void {
            success: true,
            processed: inactivePatients.length,
            messagesQueued,
            timestamp: new Date().toISOString(),
            results,
        };
    }
    catch (error) {
        firebase_functions_1.logger.error('[patientReactivation] Fatal error', { error });
        throw error;
    }
});
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Manually trigger reactivation for a specific patient
 * This can be called from a client app
 */
const triggerPatientReactivation = async (patientId) => {
    const db = (0, init_1.getAdminDb)();
    try {
        const patientSnap = await db.collection('patients').doc(patientId).get();
        if (!patientSnap.exists) {
            return { success: false, message: 'Patient not found' };
        }
        const patient = { id: patientSnap.id, ...patientSnap.data() };
        // Get organization settings
        const orgSnap = await db.collection('organizations').doc(patient.organization_id).get();
        const org = orgSnap.exists ? { id: orgSnap.id, ...orgSnap.data() } : null;
        const prefs = patient.notification_preferences || {};
        const whatsappEnabled = (org?.settings?.whatsapp_enabled ?? true) && prefs.whatsapp !== false;
        const emailEnabled = (org?.settings?.email_enabled ?? true) && prefs.email !== false;
        if (!whatsappEnabled && !emailEnabled) {
            return { success: false, message: 'All notifications disabled' };
        }
        if (whatsappEnabled && patient.phone) {
            // TODO: Send via WhatsApp provider
            firebase_functions_1.logger.info('[triggerPatientReactivation] WhatsApp queued', { patientId });
        }
        if (emailEnabled && patient.email) {
            // TODO: Send via email provider
            firebase_functions_1.logger.info('[triggerPatientReactivation] Email queued', { patientId });
        }
        return { success: true, message: 'Reactivation messages queued' };
    }
    catch (error) {
        firebase_functions_1.logger.error('[triggerPatientReactivation] Error', { patientId, error });
        return { success: false, message: 'Error triggering reactivation' };
    }
};
exports.triggerPatientReactivation = triggerPatientReactivation;
//# sourceMappingURL=reactivation.js.map