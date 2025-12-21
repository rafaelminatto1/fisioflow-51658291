import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { SessionEvolutionContainer } from './SessionEvolutionContainer';

interface SessionEvolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId?: string;
  patientId?: string;
}

export const SessionEvolutionModal: React.FC<SessionEvolutionModalProps> = ({
  open,
  onOpenChange,
  appointmentId,
  patientId
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 m-0">
        <SessionEvolutionContainer
          appointmentId={appointmentId}
          patientId={patientId}
          onClose={() => onOpenChange(false)}
          mode="modal"
        />
      </DialogContent>
    </Dialog>
  );
};

export default SessionEvolutionModal;
