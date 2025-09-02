import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useWaitingList, WaitingListEntry } from '@/hooks/useWaitingList';
import { usePatients } from '@/hooks/usePatients';
import { Clock, Plus, User, Phone, Calendar, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const waitingListSchema = z.object({
  patient_id: z.string().min(1, 'Selecione um paciente'),
  preferred_therapist_id: z.string().optional(),
  urgency_level: z.number().min(1).max(5),
  notes: z.string().optional(),
});

type WaitingListFormData = z.infer<typeof waitingListSchema>;

export const WaitingListWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { waitingList, loading, addToWaitingList, updateWaitingListEntry, removeFromWaitingList } = useWaitingList();
  const { patients } = usePatients();

  const form = useForm<WaitingListFormData>({
    resolver: zodResolver(waitingListSchema),
    defaultValues: {
      urgency_level: 3,
      notes: '',
    },
  });

  const onSubmit = async (data: WaitingListFormData) => {
    try {
      await addToWaitingList({
        patient_id: data.patient_id,
        preferred_therapist_id: data.preferred_therapist_id,
        urgency_level: data.urgency_level,
        notes: data.notes,
        status: 'waiting',
      });
      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar à lista de espera:', error);
    }
  };

  const getUrgencyColor = (level: number) => {
    switch (level) {
      case 5:
        return 'bg-red-500/20 text-red-700 border-red-200';
      case 4:
        return 'bg-orange-500/20 text-orange-700 border-orange-200';
      case 3:
        return 'bg-amber-500/20 text-amber-700 border-amber-200';
      case 2:
        return 'bg-blue-500/20 text-blue-700 border-blue-200';
      case 1:
        return 'bg-green-500/20 text-green-700 border-green-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getUrgencyLabel = (level: number) => {
    switch (level) {
      case 5: return 'Urgente';
      case 4: return 'Alta';
      case 3: return 'Média';
      case 2: return 'Baixa';
      case 1: return 'Muito Baixa';
      default: return 'Indefinida';
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateWaitingListEntry(id, { status: status as any });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const activeWaitingList = waitingList.filter(entry => entry.status === 'waiting');

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Lista de Espera
        </CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Adicionar à Lista de Espera</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="patient_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paciente</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um paciente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {patients.map((patient) => (
                            <SelectItem key={patient.id} value={patient.id}>
                              {patient.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível de Urgência</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a urgência" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">5 - Urgente</SelectItem>
                          <SelectItem value="4">4 - Alta</SelectItem>
                          <SelectItem value="3">3 - Média</SelectItem>
                          <SelectItem value="2">2 - Baixa</SelectItem>
                          <SelectItem value="1">1 - Muito Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Observações adicionais..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Adicionar</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            Carregando...
          </div>
        ) : activeWaitingList.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            Nenhum paciente na lista de espera
          </div>
        ) : (
          activeWaitingList.slice(0, 5).map((entry) => (
            <div key={entry.id} className="p-3 border border-border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{entry.patient_name}</span>
                </div>
                <Badge className={getUrgencyColor(entry.urgency_level)}>
                  {getUrgencyLabel(entry.urgency_level)}
                </Badge>
              </div>
              
              {entry.patient_phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3" />
                  <span>{entry.patient_phone}</span>
                </div>
              )}
              
              {entry.notes && (
                <p className="text-xs text-muted-foreground">{entry.notes}</p>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleStatusChange(entry.id, 'contacted')}
                >
                  Contactar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => removeFromWaitingList(entry.id)}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))
        )}
        
        {activeWaitingList.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="link" size="sm" className="text-xs">
              Ver todos ({activeWaitingList.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};