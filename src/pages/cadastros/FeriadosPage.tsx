import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/shared/ui/card';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Badge } from '@/components/shared/ui/badge';
import { Switch } from '@/components/shared/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shared/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/shared/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/web/ui/table';
import { Calendar } from '@/components/web/ui/calendar';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CalendarDays,
  CalendarIcon
} from 'lucide-react';
import { useFeriados, useCreateFeriado, useUpdateFeriado, useDeleteFeriado, Feriado, FeriadoFormData } from '@/hooks/useFeriados';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoLabels = {
  nacional: 'Nacional',
  estadual: 'Estadual',
  municipal: 'Municipal',
  ponto_facultativo: 'Ponto Facultativo',
};

const tipoColors = {
  nacional: 'bg-blue-500',
  estadual: 'bg-green-500',
  municipal: 'bg-yellow-500',
  ponto_facultativo: 'bg-gray-500',
};

export default function FeriadosPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeriado, setEditingFeriado] = useState<Feriado | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const { data: feriados, isLoading } = useFeriados(selectedYear);
  const createFeriado = useCreateFeriado();
  const updateFeriado = useUpdateFeriado();
  const deleteFeriado = useDeleteFeriado();

  const { register, handleSubmit, reset, setValue, watch } = useForm<FeriadoFormData>({
    defaultValues: {
      nome: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo: 'nacional',
      recorrente: true,
      bloqueia_agenda: true,
      organization_id: null,
    },
  });

  const filteredFeriados = feriados?.filter(f => 
    f.nome.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    reset({
      nome: '',
      data: format(new Date(), 'yyyy-MM-dd'),
      tipo: 'nacional',
      recorrente: true,
      bloqueia_agenda: true,
      organization_id: null,
    });
    setSelectedDate(new Date());
    setEditingFeriado(null);
    setIsModalOpen(true);
  };

  const openEditModal = (feriado: Feriado) => {
    reset({
      nome: feriado.nome,
      data: feriado.data,
      tipo: feriado.tipo,
      recorrente: feriado.recorrente,
      bloqueia_agenda: feriado.bloqueia_agenda,
      organization_id: feriado.organization_id,
    });
    setSelectedDate(parseISO(feriado.data));
    setEditingFeriado(feriado);
    setIsModalOpen(true);
  };

  const onSubmit = (data: FeriadoFormData) => {
    const formData = {
      ...data,
      data: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : data.data,
    };
    
    if (editingFeriado) {
      updateFeriado.mutate({ id: editingFeriado.id, ...formData }, {
        onSuccess: () => setIsModalOpen(false),
      });
    } else {
      createFeriado.mutate(formData, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este feriado?')) {
      deleteFeriado.mutate(id);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Gestão de Feriados
            </h1>
            <p className="text-muted-foreground">Configure os feriados e bloqueios de agenda</p>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Feriado
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar feriado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {filteredFeriados.length} feriado(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredFeriados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum feriado cadastrado para {selectedYear}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Feriado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Recorrente</TableHead>
                    <TableHead>Bloqueia Agenda</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeriados.map((feriado) => (
                    <TableRow key={feriado.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          {format(parseISO(feriado.data), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{feriado.nome}</TableCell>
                      <TableCell>
                        <Badge className={`${tipoColors[feriado.tipo]} text-white`}>
                          {tipoLabels[feriado.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={feriado.recorrente ? "default" : "secondary"}>
                          {feriado.recorrente ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={feriado.bloqueia_agenda ? "destructive" : "secondary"}>
                          {feriado.bloqueia_agenda ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditModal(feriado)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(feriado.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFeriado ? 'Editar Feriado' : 'Novo Feriado'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input {...register('nome', { required: true })} placeholder="Ex: Natal" />
                </div>

                <div className="space-y-2">
                  <Label>Data</Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowCalendar(true)}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={watch('tipo')} 
                    onValueChange={(v) => setValue('tipo', v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="estadual">Estadual</SelectItem>
                      <SelectItem value="municipal">Municipal</SelectItem>
                      <SelectItem value="ponto_facultativo">Ponto Facultativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={watch('recorrente')} 
                      onCheckedChange={(v) => setValue('recorrente', v)} 
                    />
                    <Label>Recorrente (todo ano)</Label>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch 
                    checked={watch('bloqueia_agenda')} 
                    onCheckedChange={(v) => setValue('bloqueia_agenda', v)} 
                  />
                  <Label>Bloqueia Agenda</Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createFeriado.isPending || updateFeriado.isPending}>
                  {editingFeriado ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Calendar Dialog */}
        <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
          <DialogContent className="sm:max-w-md p-4">
            <DialogHeader>
              <DialogTitle className="text-base">Selecionar Data</DialogTitle>
            </DialogHeader>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setShowCalendar(false);
              }}
              className="rounded-md"
            />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
