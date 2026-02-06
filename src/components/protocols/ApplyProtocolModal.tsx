import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PatientCombobox } from '@/components/ui/patient-combobox';
import { useActivePatients } from '@/hooks/usePatients';
import { ExerciseProtocol } from '@/hooks/useExerciseProtocols';
import { toast } from 'sonner';
import { db, collection, addDoc, serverTimestamp } from '@/integrations/firebase/app';
import { fisioLogger as logger } from '@/lib/errors/logger';
import { Loader2, Check } from 'lucide-react';

interface ApplyProtocolModalProps {
    protocol: ExerciseProtocol;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApplyProtocolModal({ protocol, open, onOpenChange }: ApplyProtocolModalProps) {
    const [selectedPatientId, setSelectedPatientId] = useState<string>('');
    const [isApplying, setIsApplying] = useState(false);
    const { data: patients = [], isLoading: isLoadingPatients } = useActivePatients();

    const handleApply = async () => {
        if (!selectedPatientId) {
            toast.error('Selecione um paciente');
            return;
        }

        setIsApplying(true);
        try {
            // Apply as a pathology/condition to the patient
            await addDoc(collection(db, 'patient_pathologies'), {
                patient_id: selectedPatientId,
                pathology_name: protocol.condition_name,
                protocol_id: protocol.id,
                protocol_name: protocol.name,
                status: 'em_tratamento',
                onset_date: new Date().toISOString().split('T')[0],
                created_at: serverTimestamp(),
                updated_at: serverTimestamp(),
                applied_protocol: true
            });

            // Also optionally add the first milestone as a goal
            if (protocol.milestones && Array.isArray(protocol.milestones) && protocol.milestones.length > 0) {
                const firstMilestone = protocol.milestones[0];
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() + (firstMilestone.week * 7));

                await addDoc(collection(db, 'patient_goals'), {
                    patient_id: selectedPatientId,
                    description: `Marco Protocolo: ${firstMilestone.description}`,
                    target_date: targetDate.toISOString().split('T')[0],
                    status: 'em_andamento',
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp()
                });
            }

            toast.success(`Protocolo ${protocol.name} aplicado com sucesso!`);
            onOpenChange(false);
        } catch (error) {
            logger.error('Error applying protocol to patient', error, 'ApplyProtocolModal');
            toast.error('Erro ao aplicar protocolo');
        } finally {
            setIsApplying(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Aplicar Protocolo a Paciente</DialogTitle>
                    <DialogDescription>
                        Vincule o protocolo <strong>{protocol.name}</strong> a um paciente para iniciar o acompanhamento.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="patient" className="text-sm font-medium">
                            Selecione o Paciente
                        </label>
                        <PatientCombobox
                            patients={patients}
                            value={selectedPatientId}
                            onValueChange={setSelectedPatientId}
                            disabled={isLoadingPatients || isApplying}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
                        Cancelar
                    </Button>
                    <Button onClick={handleApply} disabled={!selectedPatientId || isApplying}>
                        {isApplying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Aplicando...
                            </>
                        ) : (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Confirmar Aplicação
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
