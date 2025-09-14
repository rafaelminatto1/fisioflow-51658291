import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NewExerciseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewExerciseModal({ open, onOpenChange }: NewExerciseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p>Formulário de novo exercício em desenvolvimento...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}