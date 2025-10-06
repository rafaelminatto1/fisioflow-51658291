import { useState } from 'react';
import { useParticipantes, useCreateParticipante, useDeleteParticipante, useExportParticipantes } from '@/hooks/useParticipantes';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Download, FileText } from 'lucide-react';
import { exportParticipantesPDF } from '@/lib/export/pdfExport';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { participanteCreateSchema, ParticipanteCreate } from '@/lib/validations/participante';

interface ParticipantesTabProps {
  eventoId: string;
}

export function ParticipantesTab({ eventoId }: ParticipantesTabProps) {
  const [open, setOpen] = useState(false);
  const { data: participantes, isLoading } = useParticipantes(eventoId);
  const createParticipante = useCreateParticipante();
  const deleteParticipante = useDeleteParticipante();
  const exportParticipantes = useExportParticipantes();
  const { toast } = useToast();
  const { canWrite, canDelete } = usePermissions();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ParticipanteCreate>({
    resolver: zodResolver(participanteCreateSchema),
    defaultValues: {
      evento_id: eventoId,
      segue_perfil: false,
    },
  });

  const onSubmit = async (data: ParticipanteCreate) => {
    await createParticipante.mutateAsync(data);
    reset({ evento_id: eventoId, segue_perfil: false });
    setOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja remover este participante?')) {
      await deleteParticipante.mutateAsync({ id, eventoId });
    }
  };

  const handleExport = async () => {
    await exportParticipantes.mutateAsync(eventoId);
  };

  const handleExportPDF = () => {
    if (!participantes) return;
    
    exportParticipantesPDF(
      participantes.map(p => ({
        nome: p.nome,
        contato: p.contato,
        instagram: p.instagram,
        segue_perfil: p.segue_perfil,
        observacoes: p.observacoes
      })),
      'Evento' // TODO: passar nome do evento
    );
    
    toast({
      title: 'PDF gerado',
      description: 'Lista de participantes exportada com sucesso',
    });
  };

  const totalSeguem = participantes?.filter(p => p.segue_perfil).length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Participantes</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {participantes?.length || 0} participantes ({totalSeguem} seguem o perfil)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!participantes || participantes.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={!participantes || participantes.length === 0}>
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          {canWrite('eventos') && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Participante
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Participante</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input id="nome" {...register('nome')} />
                  {errors.nome && (
                    <p className="text-sm text-red-500 mt-1">{errors.nome.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contato">Contato</Label>
                  <Input id="contato" {...register('contato')} />
                  {errors.contato && (
                    <p className="text-sm text-red-500 mt-1">{errors.contato.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" placeholder="@usuario ou URL" {...register('instagram')} />
                  {errors.instagram && (
                    <p className="text-sm text-red-500 mt-1">{errors.instagram.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    name="segue_perfil"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="segue_perfil"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="segue_perfil" className="cursor-pointer">
                    Segue o perfil
                  </Label>
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea id="observacoes" {...register('observacoes')} />
                  {errors.observacoes && (
                    <p className="text-sm text-red-500 mt-1">{errors.observacoes.message}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createParticipante.isPending}>
                    {createParticipante.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !participantes || participantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum participante cadastrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Instagram</TableHead>
                <TableHead>Segue Perfil</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((participante) => (
                <TableRow key={participante.id}>
                  <TableCell>{participante.nome}</TableCell>
                  <TableCell>{participante.contato || '-'}</TableCell>
                  <TableCell>{participante.instagram || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={participante.segue_perfil ? 'default' : 'secondary'}>
                      {participante.segue_perfil ? 'Sim' : 'Não'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {participante.observacoes || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {canDelete('eventos') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(participante.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
