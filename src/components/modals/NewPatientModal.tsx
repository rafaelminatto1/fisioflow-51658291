import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const NewPatientModal: React.FC<{ open: boolean; onOpenChange: (o: boolean) => void }> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Paciente</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground">Formulário em breve.</p>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientModal;
