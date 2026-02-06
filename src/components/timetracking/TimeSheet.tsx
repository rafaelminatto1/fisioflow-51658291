/**
 * TimeSheet - Timesheet diário de entrada de tempo
 * Tabela editável com entrada de tempo manual
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {

  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Tag,
  MoreVertical,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDuration, formatHoursDecimal } from '@/lib/timetracking/timeCalculator';

import type { TimeEntry } from '@/types/timetracking';

interface TimeSheetProps {
  entries: TimeEntry[];
  onUpdate: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function TimeSheet({ entries, onUpdate, onDelete, isLoading }: TimeSheetProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<TimeEntry>>({});

  const handleEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditValues({
      description: entry.description,
      duration_seconds: entry.duration_seconds,
      is_billable: entry.is_billable,
      hourly_rate: entry.hourly_rate,
    });
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      await onUpdate(editingId, editValues);
      setEditingId(null);
      setEditValues({});
    } catch (err) {
      console.error('Erro ao salvar:', err);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({});
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta entrada?')) {
      await onDelete(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhuma entrada de tempo encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use o timer ou adicione manualmente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Faturável</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isEditing = editingId === entry.id;

              return (
                <TableRow key={entry.id}>
                  {/* Descrição */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        value={editValues.description || ''}
                        onChange={(e) =>
                          setEditValues({ ...editValues, description: e.target.value })
                        }
                        autoFocus
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{entry.description}</div>
                        {entry.task_id && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Tarefa
                          </Badge>
                        )}
                        {entry.patient_id && (
                          <Badge variant="outline" className="text-xs mt-1 ml-1">
                            Paciente
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Data */}
                  <TableCell>
                    <div className="text-sm">
                      <div>
                        {format(entry.start_time.toDate(), 'dd/MMM', { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(entry.start_time.toDate(), 'HH:mm')} -{' '}
                        {entry.end_time
                          ? format(entry.end_time.toDate(), 'HH:mm')
                          : 'em andamento'}
                      </div>
                    </div>
                  </TableCell>

                  {/* Duração */}
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={Math.round((editValues.duration_seconds || 0) / 60)}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            duration_seconds: Number(e.target.value) * 60,
                          })
                        }
                        className="w-20"
                        min="1"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {formatDuration(entry.duration_seconds)}
                        </span>
                      </div>
                    )}
                  </TableCell>

                  {/* Faturável */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {entry.is_billable && (
                        <DollarSign className="w-4 h-4 text-green-500" />
                      )}
                      <span className="text-sm">
                        {entry.is_billable ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Valor */}
                  <TableCell>
                    {entry.total_value ? (
                      <span className="font-mono text-sm">
                        R$ {entry.total_value.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Tags */}
                  <TableCell>
                    {entry.tags && entry.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                          Salvar
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(entry)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(entry.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
