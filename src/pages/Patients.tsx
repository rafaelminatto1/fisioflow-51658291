import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewPatientModal } from '@/components/modals/NewPatientModal';
import { EditPatientModal } from '@/components/modals/EditPatientModal';
import { ViewPatientModal } from '@/components/modals/ViewPatientModal';
import { DeletePatientDialog } from '@/components/modals/DeletePatientDialog';
import { usePatientsQuery, useDeletePatient, PatientDB } from '@/hooks/usePatientsQuery';
import { usePagination } from '@/hooks/performance/useOptimizedList';
import { PatientHelpers } from '@/types';
import {
  Plus,
  Search,
  Users,
  Filter,
  Download,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { cn, calculateAge, exportToCSV } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const Patients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [editingPatient, setEditingPatient] = useState<string | null>(null);
  const [viewingPatient, setViewingPatient] = useState<string | null>(null);
  const [deletingPatient, setDeletingPatient] = useState<PatientDB | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const { data: patients = [], isLoading: loading } = usePatientsQuery();
  const deletePatient = useDeletePatient();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get unique conditions and statuses for filters
  const uniqueConditions = useMemo(() => {
    const conditions = [...new Set(patients.map(p => p.main_condition).filter(Boolean))];
    return conditions.sort();
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const patientName = PatientHelpers.getName(patient);
      const matchesSearch =
        patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.main_condition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || patient.main_condition === conditionFilter;

      return matchesSearch && matchesStatus && matchesCondition;
    });
  }, [patients, searchTerm, statusFilter, conditionFilter]);

  // Use pagination hook
  const {
    items: paginatedPatients,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage
  } = usePagination(filteredPatients, 10);

  // Reset pagination when filters change
  useEffect(() => {
    goToPage(0);
  }, [searchTerm, statusFilter, conditionFilter, goToPage]);

  const handleDeletePatient = () => {
    if (!deletingPatient) return;
    deletePatient.mutate(deletingPatient.id, {
      onSuccess: () => setDeletingPatient(null),
    });
  };

  const exportPatients = () => {
    const data = filteredPatients.map(patient => {
      const patientName = PatientHelpers.getName(patient);
      return {
        name: patientName || 'Sem nome',
        email: patient.email || '',
        phone: patient.phone || '',
        age: calculateAge(patient.birth_date),
        gender: patient.gender || '',
        condition: patient.main_condition || '',
        status: patient.status || '',
        progress: patient.progress || 0
      };
    });

    const headers = ['Nome', 'Email', 'Telefone', 'Idade', 'Gênero', 'Condição Principal', 'Status', 'Progresso'];

    const success = exportToCSV(data, 'pacientes.csv', headers);

    if (success) {
      toast({
        title: 'Exportação concluída!',
        description: 'Lista de pacientes exportada com sucesso.',
      });
    } else {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível exportar a lista de pacientes.',
        variant: 'destructive',
      });
    }
  };

  // Show loading state
  if (loading) {
    return (
      <MainLayout>
        <LoadingSkeleton type="card" rows={4} />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in pb-20 md:pb-0">
        {/* Header moderno com stats */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Pacientes
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Gerencie o cadastro e evolução dos seus pacientes
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportPatients}
                className="hidden sm:flex shadow-md hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              <Button
                size="sm"
                className="shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                onClick={() => setIsNewPatientModalOpen(true)}
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo Paciente</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-medical shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">{patients.length}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">
                      {patients.filter(p => p.status === 'Em Tratamento').length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">
                      {patients.filter(p => p.status === 'Inicial').length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Novos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-500/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl font-bold">
                      {patients.filter(p => p.status === 'Concluído').length}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Concluídos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerta de cadastros incompletos */}
        <IncompleteRegistrationAlert />

        {/* Search and Filters - Modernizados */}
        <Card className="shadow-card">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Busca principal */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  placeholder="Buscar pacientes por nome, condição, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-background/50"
                />
              </div>

              {/* Filtros em grid responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Filtrar por status" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">📋 Todos os Status</SelectItem>
                    <SelectItem value="Inicial">🆕 Inicial</SelectItem>
                    <SelectItem value="Em Tratamento">💚 Em Tratamento</SelectItem>
                    <SelectItem value="Recuperação">⚡ Recuperação</SelectItem>
                    <SelectItem value="Concluído">✅ Concluído</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="h-11">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <SelectValue placeholder="Filtrar por condição" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏷️ Todas as Condições</SelectItem>
                    {uniqueConditions.map((condition) => (
                      <SelectItem key={String(condition)} value={String(condition)}>
                        {String(condition)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Indicador de filtros ativos */}
              {(statusFilter !== 'all' || conditionFilter !== 'all' || searchTerm) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{filteredPatients.length} paciente(s) encontrado(s)</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setConditionFilter('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        {loading ? (
          <LoadingSkeleton type="list" rows={8} />
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            description={
              searchTerm
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece adicionando seu primeiro paciente.'
            }
            action={
              !searchTerm
                ? {
                  label: 'Novo Paciente',
                  onClick: () => setIsNewPatientModalOpen(true)
                }
                : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 animate-fade-in">
              {paginatedPatients.map((patient, index) => (
                <Card
                  key={patient.id}
                  className="group flex items-center gap-4 p-3 rounded-xl bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-border dark:hover:border-slate-700"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setViewingPatient(patient.id)}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12 ring-2 ring-border dark:ring-slate-700 shrink-0">
                      <AvatarFallback className={cn(
                        "text-sm font-bold",
                        patient.status === 'Em Tratamento' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" :
                          patient.status === 'Inicial' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {(() => {
                          const name = PatientHelpers.getName(patient);
                          return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'P';
                        })()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{PatientHelpers.getName(patient) || 'Paciente sem nome'}</p>
                      <Badge className={cn(
                        "inline-flex items-center rounded-full border border-transparent text-[10px] font-semibold px-2 py-0.5",
                        patient.status === 'Em Tratamento' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                          patient.status === 'Inicial' ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                            "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      )}>
                        {patient.status || 'Inicial'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{patient.phone || patient.email || `${calculateAge(patient.birth_date)} anos`}</p>
                  </div>
                  <div className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-2 border-t mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {currentPage + 1} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages - 1}
                    className="h-8 px-2"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewPatientModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
      />

      {editingPatient && (
        <EditPatientModal
          patientId={editingPatient}
          open={true}
          onOpenChange={() => setEditingPatient(null)}
        />
      )}

      {viewingPatient && (
        <ViewPatientModal
          patientId={viewingPatient}
          open={!!viewingPatient}
          onOpenChange={() => setViewingPatient(null)}
        />
      )}

      <DeletePatientDialog
        open={!!deletingPatient}
        onOpenChange={(open) => !open && setDeletingPatient(null)}
        patientName={deletingPatient?.name}
        onConfirm={handleDeletePatient}
        isDeleting={deletePatient.isPending}
      />
    </MainLayout>
  );
};

export default Patients;
