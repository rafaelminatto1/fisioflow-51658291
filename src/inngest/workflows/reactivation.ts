/**
 * Reactivation Workflow
 *
 * Runs weekly to find inactive patients (no appointments > 30 days)
 * and sends a friendly "We miss you" message.
 */

import { inngest, retryConfig } from '../../lib/inngest/client.js';
import { Events, InngestStep } from '../../lib/inngest/types.js';
import { createClient } from '@supabase/supabase-js';

// Define event manually if not in types yet
const REACTIVATION_EVENT = 'cron/reactivation.weekly';

interface Appointment {
    date: string;
    status: string;
}

interface Patient {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    organization_id: string;
    notification_preferences?: {
        whatsapp?: boolean;
        email?: boolean;
    };
    appointments?: Appointment[];
    organization?: Organization;
}

interface Organization {
    id: string;
    name: string;
    settings?: {
        whatsapp_enabled?: boolean;
        email_enabled?: boolean;
    };
}

export const reactivationWorkflow = inngest.createFunction(
    {
        id: 'fisioflow-reactivation-weekly',
        name: 'Weekly Reactivation Campaign',
        retries: retryConfig.whatsapp.maxAttempts,
    },
    {
        cron: '0 10 * * 1', // 10:00 AM on Mondays
    },
    async ({ step }: { step: InngestStep }) => {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Step 1: Find patients inactive > 30 days
        const patients = await step.run('find-inactive-patients', async () => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // 1. Get active patients with WA enabled (perf optim)
            const { data: activePatients, error } = await supabase
                .from('patients')
                .select(`
                id, name, phone, email, organization_id, notification_preferences,
                appointments!patient_id(date, status)
            `)
                .eq('active', true)
                .order('date', { foreignTable: 'appointments', ascending: false });

            if (error) throw new Error(`Failed to fetch patients: ${error.message}`);

            const inactivePatients: Patient[] = [];
            const now = new Date();

            const patientList = activePatients as unknown as Patient[];

            for (const p of patientList || []) {
                // Check preferences
                if (p.notification_preferences?.whatsapp === false && p.notification_preferences?.email === false) continue;
                if (!p.phone && !p.email) continue;

                const appointments = p.appointments || [];
                // Filter completed appointments
                const lastApp = appointments.find((a) =>
                    ['concluido', 'realizado', 'attended'].includes(a.status)
                );

                if (lastApp) {
                    const lastDate = new Date(lastApp.date);
                    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // If last appointment was between 30 and 37 days ago (to avoid spamming every week)
                    // Weekly run: we target the window of [30, 37] days.
                    if (diffDays >= 30 && diffDays <= 37) {
                        inactivePatients.push(p);
                    }
                } else {
                    // Never had an appointment? Maybe new lead. Skip for now or different strategy.
                    // We focus on reactivation.
                }
            }

            return inactivePatients;
        });

        if (patients.length === 0) {
            return { success: true, processed: 0, message: 'No inactive patients found in window' };
        }

        // Step 2: Get Org Settings
        const patientsWithOrg = await step.run('get-org-settings', async () => {
            const orgIds = [...new Set(patients.map((p) => p.organization_id))];
            const { data: organizations } = await supabase
                .from('organizations')
                .select('id, name, settings')
                .in('id', orgIds);

            const orgMap = new Map((organizations || []).map((o) => [o.id, o]));

            return patients.map((p) => ({
                ...p,
                organization: orgMap.get(p.organization_id) as Organization | undefined
            }));
        });

        // Step 3: Queue Messages
        const results = await step.run('queue-reactivation', async () => {
            const events: any[] = [];

            for (const p of patientsWithOrg) {
                const org = p.organization;
                const notificationPrefs = p.notification_preferences || {};

                const whatsappEnabled = (org?.settings?.whatsapp_enabled ?? true) && (notificationPrefs.whatsapp !== false);
                const emailEnabled = (org?.settings?.email_enabled ?? true) && (notificationPrefs.email !== false);

                if (whatsappEnabled && p.phone) {
                    events.push({
                        name: 'whatsapp/reactivation',
                        data: {
                            to: p.phone,
                            patientName: p.name,
                            organizationName: org?.name || 'FisioFlow'
                        }
                    });
                }

                if (emailEnabled && p.email) {
                    events.push({
                        name: 'email/reactivation',
                        data: {
                            to: p.email,
                            patientName: p.name,
                            organizationName: org?.name || 'FisioFlow'
                        }
                    });
                }
            }

            if (events.length > 0) {
                await inngest.send(events);
            }

            return { queued: events.length };
        });

        return {
            success: true,
            queued: results.queued,
            timestamp: new Date().toISOString()
        };
    }
);
