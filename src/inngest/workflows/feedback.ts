
import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { createClient } from '@supabase/supabase-js';

// Define manually to avoid type errors for now
const FEEDBACK_EVENT = 'whatsapp/feedback.request';

export const appointmentCompletedWorkflow = inngest.createFunction(
    {
        id: 'fisioflow-feedback-request',
        name: 'Request Feedback after Appointment',
        retries: retryConfig.whatsapp.maxAttempts,
        // cancelOn: [{ event: Events.APPOINTMENT_CANCELLED, match: "data.appointmentId" }] // Optional: if status changes back?
    },
    { event: Events.APPOINTMENT_UPDATED }, // Trigger on update
    async ({ event, step }: { event: any; step: InngestStep }) => {
        const { old_record, record } = event.data;

        // Only trigger if status changed to 'concluido' (or 'completed', 'attended')
        const isCompleted = ['concluido', 'realizado', 'attended'].includes(record.status?.toLowerCase());
        const wasCompleted = ['concluido', 'realizado', 'attended'].includes(old_record?.status?.toLowerCase());

        if (!isCompleted || wasCompleted) {
            return { skipped: true, reason: 'Not a new completion' };
        }

        const appointmentId = record.id;
        const patientId = record.patient_id;

        // Step 1: Wait 2 hours after the appointment
        // We use step.sleep to give the patient time to go home.
        await step.sleep('2h');

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Step 2: Fetch details
        const details = await step.run('fetch-details', async () => {
            const { data: appointment, error } = await supabase
                .from('appointments')
                .select(`
                    id, date, status,
                    patients (name, phone, notification_preferences, organization_id),
                    organizations (name, settings)
                `)
                .eq('id', appointmentId)
                .single();

            if (error) throw new Error(error.message);
            return appointment;
        });

        if (!details || details.status !== record.status) {
            // Status changed during sleep?
            return { skipped: true, reason: 'Status changed or not found' };
        }

        // Step 3: Check preferences and send
        const patient = details.patients as any;
        const org = details.organizations as any;

        if (!patient?.phone) return { skipped: true, reason: 'No phone' };
        if (patient.notification_preferences?.whatsapp === false) return { skipped: true, reason: 'Opt-out' };
        if (org?.settings?.whatsapp_enabled === false) return { skipped: true, reason: 'Org disabled WA' };

        await step.run('send-feedback-request', async () => {
            await inngest.send({
                name: 'whatsapp/send', // Generic send or specific feedback event
                data: {
                    to: patient.phone,
                    type: 'template', // Enforce template for business initiated (or window check)
                    templateName: 'feedback_request', // Assumes this template exists
                    language: 'pt_BR',
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: patient.name.split(' ')[0] }, // First name
                                { type: 'text', text: org?.name || 'FisioFlow' }
                            ]
                        }
                    ]
                }
            });
        });

        return { success: true, processed: true };
    }
);
