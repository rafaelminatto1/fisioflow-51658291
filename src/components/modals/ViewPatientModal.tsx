import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const ViewPatientModal: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void; patientId?: string }> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalhes do Paciente</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">Detalhes em breve.</p>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPatientModal;
