import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bug } from 'lucide-react';
import { Patient, Appointment } from '@/types';

interface EvolutionDebugInfoProps {
    patientId?: string;
    patient?: Patient | null;
    appointmentId?: string;
    appointment?: Appointment | null;
    appointmentError?: Error | null;
    patientError?: Error | null;
}

export function EvolutionDebugInfo({ patientId, patient, appointmentId, appointment, appointmentError, patientError }: EvolutionDebugInfoProps) {
    if (!import.meta.env.DEV) return null;

    // Get patient_id from appointment for debugging
    const appointmentPatientId = (appointment as unknown)?.patient_id;

    return (
        <Alert className="mb-4 bg-slate-950 text-slate-200 border-slate-800">
            <Bug className="h-4 w-4" />
            <AlertTitle>DEV INFO</AlertTitle>
            <AlertDescription className="font-mono text-xs">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p>Patient ID (from hook): {patientId || '<null>'}</p>
                        <p>Patient ID (from appointment): {appointmentPatientId || '<null>'}</p>
                        <p>Patient found: {patient ? 'Yes' : 'No'}</p>
                        <p>Patient Name: {patient?.name || '<null>'}</p>
                    </div>
                    <div>
                        <p>Appointment ID: {appointmentId}</p>
                        <p>Appointment found: {appointment ? 'Yes' : 'No'}</p>
                        <p>Status: {appointment?.status || '<null>'}</p>
                        <p>Date: {appointment?.date ? String(appointment.date) : '<null>'}</p>
                    </div>
                </div>

                {appointmentError && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                        <span className="text-amber-500">appointmentError:</span>
                        <p className="text-red-400 truncate">{appointmentError.message}</p>
                    </div>
                )}

                {patientError && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                        <span className="text-amber-500">patientError:</span>
                        <p className="text-red-400 truncate">{patientError.message}</p>
                    </div>
                )}

                {!patient && !patientError && appointment && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                        <span className="text-red-500">ISSUE DETECTED:</span>
                        <p className="text-yellow-400">
                            Appointment exists but patient is null. Check if patient_id is valid and patient exists in database.
                        </p>
                    </div>
                )}
            </AlertDescription>
        </Alert>
    );
}
