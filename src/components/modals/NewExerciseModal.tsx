import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface NewExerciseModalProps {
  trigger: React.ReactNode;
}

export const NewExerciseModal: React.FC<NewExerciseModalProps> = ({ trigger }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Exercício</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Nome do exercício" />
          </div>
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" placeholder="Categoria" />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" placeholder="Descrição do exercício" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};