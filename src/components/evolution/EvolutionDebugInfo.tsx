import { Alert, AlertDescription, AlertTitle } from '@/components/shared/ui/alert';
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

    return (
        <Alert className="mb-4 bg-slate-950 text-slate-200 border-slate-800">
            <Bug className="h-4 w-4" />
            <AlertTitle>DEV INFO</AlertTitle>
            <AlertDescription className="font-mono text-xs">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p>Patient ID: {patientId}</p>
                        <p>Name: {patient?.name}</p>
                        <p>Has Phone: {patient?.phone ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                        <p>Appointment ID: {appointmentId}</p>
                        <p>Status: {appointment?.status}</p>
                        <p>Date: {appointment?.date}</p>
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
            </AlertDescription>
        </Alert>
    );
}
