import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  UserPlus,
  UserMinus,
  Stethoscope,
  CalendarDays,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Therapist {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  crefito?: string;
  specialties?: string[];
  phone?: string;
  patient_count?: number;
}

interface PatientAssignment {
  patient_id: string;
  therapist_id: string;
  assigned_at: Date;
  assigned_by: string;
  is_primary: boolean;
  notes?: string;
}

interface TherapistAssignmentProps {
  patientId: string;
  patientName: string;
}

export function TherapistAssignment({ patientId, patientName }: TherapistAssignmentProps) {
  const [open, setOpen] = useState(false);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [assignments, setAssignments] = useState<PatientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchTherapists();
      fetchAssignments();
    }
  }, [open, fetchTherapists]);

  const fetchTherapists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          full_name,
          role,
          crefito,
          specialties,
          phone
        `)
        .eq('role', 'fisioterapeuta')
        .order('full_name');

      if (error) throw error;

      // Mock patient count for demonstration
      const therapistsWithStats = data?.map(therapist => ({
        ...therapist,
        patient_count: Math.floor(Math.random() * 20) + 1 // Random number for demo
      })) || [];

      setTherapists(therapistsWithStats);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      toast({
        title: 'Erro ao carregar fisioterapeutas',
        description: 'Não foi possível carregar a lista de fisioterapeutas.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      
      // For now, we'll simulate the assignments since the table doesn't exist yet
      // In a real implementation, you would fetch from a patient_assignments table
      
      // Simulate some existing assignments
      const mockAssignments: PatientAssignment[] = [];
      
      setAssignments(mockAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignTherapist = async () => {
    if (!selectedTherapist) {
      toast({
        title: 'Selecione um fisioterapeuta',
        description: 'Você deve selecionar um fisioterapeuta para fazer a atribuição.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAssigning(true);

      // In a real implementation, you would insert into a patient_assignments table
      // For now, we'll simulate the assignment
      
      const newAssignment: PatientAssignment = {
        patient_id: patientId,
        therapist_id: selectedTherapist,
        assigned_at: new Date(),
        assigned_by: (await supabase.auth.getUser()).data.user?.id || '',
        is_primary: assignments.length === 0, // First assignment becomes primary
      };

      // Add to local state for demonstration
      setAssignments(prev => [...prev, newAssignment]);

      const therapistName = therapists.find(t => t.id === selectedTherapist)?.full_name;

      toast({
        title: 'Fisioterapeuta atribuído!',
        description: `${therapistName} foi atribuído(a) ao paciente ${patientName}.`,
      });

      setSelectedTherapist('');

    } catch (error) {
      console.error('Error assigning therapist:', error);
      toast({
        title: 'Erro na atribuição',
        description: 'Não foi possível atribuir o fisioterapeuta.',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  const removeAssignment = async (assignmentIndex: number) => {
    try {
      // In a real implementation, you would delete from the database
      setAssignments(prev => prev.filter((_, index) => index !== assignmentIndex));
      
      toast({
        title: 'Atribuição removida',
        description: 'O fisioterapeuta foi removido da lista de responsáveis pelo paciente.',
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a atribuição.',
        variant: 'destructive',
      });
    }
  };

  const getTherapistDetails = (therapistId: string) => {
    return therapists.find(t => t.id === therapistId);
  };

  return (
    <div className="space-y-4">
      {/* Current Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Fisioterapeutas Responsáveis
            </CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Atribuir
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Atribuir Fisioterapeuta</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Therapist Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Selecionar Fisioterapeuta</label>
                    <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um fisioterapeuta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {therapists.map((therapist) => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {therapist.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{therapist.full_name}</p>
                                {therapist.crefito && (
                                  <p className="text-xs text-muted-foreground">CREFITO: {therapist.crefito}</p>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Therapist Details */}
                  {selectedTherapist && (
                    <Card>
                      <CardContent className="p-4">
                        {(() => {
                          const therapist = getTherapistDetails(selectedTherapist);
                          if (!therapist) return null;
                          
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-12 h-12">
                                  <AvatarFallback>
                                    {therapist.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium">{therapist.full_name}</h4>
                                  {therapist.crefito && (
                                    <p className="text-sm text-muted-foreground">CREFITO: {therapist.crefito}</p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{therapist.patient_count} pacientes</span>
                                </div>
                                {therapist.phone && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">📞</span>
                                    <span>{therapist.phone}</span>
                                  </div>
                                )}
                              </div>

                              {therapist.specialties && therapist.specialties.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Especialidades:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {therapist.specialties.map((specialty, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {specialty}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={assignTherapist} disabled={!selectedTherapist || assigning}>
                      {assigning ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Atribuindo...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Atribuir
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando atribuições...</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-muted-foreground">Nenhum fisioterapeuta atribuído</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Atribuir" para designar um fisioterapeuta responsável.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment, index) => {
                const therapist = getTherapistDetails(assignment.therapist_id);
                if (!therapist) return null;

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {therapist.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{therapist.full_name}</p>
                          {assignment.is_primary && (
                            <Badge variant="default" className="text-xs">
                              Principal
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(assignment.assigned_at, "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          {therapist.crefito && (
                            <span>CREFITO: {therapist.crefito}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAssignment(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Funcionalidade em Desenvolvimento</p>
              <p className="text-xs text-amber-700 mt-1">
                Este sistema de atribuição de fisioterapeutas está em fase de desenvolvimento. 
                As atribuições são simuladas e não são persistidas no banco de dados ainda.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}