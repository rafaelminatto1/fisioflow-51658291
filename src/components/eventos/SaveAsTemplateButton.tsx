import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {

  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTemplateFromEvento } from '@/hooks/useEventoTemplates';

interface SaveAsTemplateButtonProps {
  eventoId: string;
  eventoNome: string;
}

export const SaveAsTemplateButton: React.FC<SaveAsTemplateButtonProps> = ({
  eventoId,
  eventoNome,
}) => {
  const [open, setOpen] = useState(false);
  const [nomeTemplate, setNomeTemplate] = useState(`Template - ${eventoNome}`);
  const createTemplate = useCreateTemplateFromEvento();

  const handleSave = () => {
    createTemplate.mutate(
      { eventoId, nome: nomeTemplate },
      {
        onSuccess: () => {
          setOpen(false);
          setNomeTemplate(`Template - ${eventoNome}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">Salvar como Template</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Crie um template reutilizável a partir deste evento. O checklist será incluído automaticamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome-template">Nome do Template</Label>
            <Input
              id="nome-template"
              value={nomeTemplate}
              onChange={(e) => setNomeTemplate(e.target.value)}
              placeholder="Ex: Template - Corrida de Rua"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!nomeTemplate || createTemplate.isPending}>
            {createTemplate.isPending ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
