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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { LazyComponent } from '@/components/common/LazyComponent';
import {
  PatientCreateModal,
  PatientActions,
  PatientAdvancedFilters,
  PatientAnalytics,
  countActiveFilters,
  matchesFilters,
  type PatientFilters
} from '@/components/patients';
import { usePatientsPaginated } from '@/hooks/usePatientCrud';
import { useMultiplePatientStats, formatFirstEvaluationDate } from '@/hooks/usePatientStats';
import { PatientHelpers } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus,
  Search,
  Users,
  Filter,
  Download,
  ChevronRight,
  Calendar,
  Activity,
} from 'lucide-react';
import { cn, calculateAge, exportToCSV } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const Patients = () => {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<PatientFilters>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use paginated query with server-side filtering
  const {
    data: patients = [],
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    isLoading: loading,
  } = usePatientsPaginated({
    organizationId,
    status: statusFilter,
    searchTerm: debouncedSearch,
    pageSize: 20,
  });

  // Buscar estatísticas de múltiplos pacientes
  const patientIds = useMemo(() => patients.map(p => p.id), [patients]);
  const { data: statsMap = {} } = useMultiplePatientStats(patientIds);

  const navigate = useNavigate();

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1);
  }, [statusFilter, debouncedSearch, conditionFilter]);

  // Get unique conditions and statuses for filters (from current page)
  const uniqueConditions = useMemo(() => {
    const conditions = [...new Set(patients.map(p => p.main_condition).filter(Boolean))];
    return conditions.sort();
  }, [patients]);

  // Apply client-side filters for condition (not supported server-side yet)
  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const matchesCondition = conditionFilter === 'all' || patient.main_condition === conditionFilter;
      // Advanced filters still apply on current page results
      const matchesAdvancedFilters = matchesFilters(patient.id, advancedFilters, statsMap);
      return matchesCondition && matchesAdvancedFilters;
    });
  }, [patients, conditionFilter, advancedFilters, statsMap]);

  // Calcular contagem de filtros ativos
  const activeAdvancedFiltersCount = countActiveFilters(advancedFilters);

  // Estatísticas dos pacientes na página atual filtrada
  const filteredStats = useMemo(() => {
    const stats = {
      total: totalCount, // Total from server (respecting server-side filters)
      active: 0,
      inactive7: 0,
      inactive30: 0,
      inactive60: 0,
      noShowRisk: 0,
      hasUnpaid: 0,
      newPatients: 0,
      completed: 0
    };

    // Only count visible patients on current page
    filteredPatients.forEach(p => {
      const patientStats = statsMap[p.id];
      if (!patientStats) return;

      switch (patientStats.classification) {
        case 'active':
          stats.active++;
          break;
        case 'inactive_7':
          stats.inactive7++;
          break;
        case 'inactive_30':
          stats.inactive30++;
          break;
        case 'inactive_custom':
          stats.inactive60++;
          break;
        case 'no_show_risk':
          stats.noShowRisk++;
          break;
        case 'has_unpaid':
          stats.hasUnpaid++;
          break;
        case 'new_patient':
          stats.newPatients++;
          break;
      }

      if (p.status === 'Concluído') {
        stats.completed++;
      }
    });

    return stats;
  }, [filteredPatients, statsMap, totalCount]);

  const handleFilterChange = (filters: PatientFilters) => {
    setAdvancedFilters(filters);
  };

  const handleClearFilters = () => {
    setAdvancedFilters({});
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setConditionFilter('all');
    setAdvancedFilters({});
  };

  const exportPatients = () => {
    const data = filteredPatients.map(patient => {
      const patientName = PatientHelpers.getName(patient);
      const patientStats = statsMap[patient.id];
      return {
        name: patientName || 'Sem nome',
        email: patient.email || '',
        phone: patient.phone || '',
        age: calculateAge(patient.birth_date),
        gender: patient.gender || '',
        condition: patient.main_condition || '',
        status: patient.status || '',
        progress: patient.progress || 0,
        sessions: patientStats?.sessionsCompleted || 0,
        firstEvaluation: patientStats?.firstEvaluationDate || '',
      };
    });

    const headers = ['Nome', 'Email', 'Telefone', 'Idade', 'Gênero', 'Condição Principal', 'Status', 'Progresso', 'Sessões', 'Primeira Avaliação'];

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
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="hidden sm:flex shadow-md hover:shadow-lg transition-all"
              >
                <Activity className="w-4 h-4 mr-2" />
                {showAnalytics ? 'Esconder' : 'Análises'}
              </Button>
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
                    <p className="text-lg sm:text-2xl font-bold">{totalCount}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {totalPages > 1 ? `Pág ${currentPage}/${totalPages}` : 'Total'}
                    </p>
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
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Ativos (página)</p>
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
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Novos (página)</p>
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
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Concluídos (página)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Classification Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <span className="text-2xl">⚠️</span>
                  <span className="text-xl font-bold mt-1">{filteredStats.inactive7}</span>
                  <span className="text-[10px] text-muted-foreground">Inativos 7d</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <span className="text-2xl">🔴</span>
                  <span className="text-xl font-bold mt-1">{filteredStats.inactive30}</span>
                  <span className="text-[10px] text-muted-foreground">Inativos 30d</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <span className="text-2xl">🚫</span>
                  <span className="text-xl font-bold mt-1">{filteredStats.noShowRisk}</span>
                  <span className="text-[10px] text-muted-foreground">Risco No-Show</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <span className="text-2xl">💰</span>
                  <span className="text-xl font-bold mt-1">{filteredStats.hasUnpaid}</span>
                  <span className="text-[10px] text-muted-foreground">Com Pendências</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <span className="text-2xl">🆕</span>
                  <span className="text-xl font-bold mt-1">{filteredStats.newPatients}</span>
                  <span className="text-[10px] text-muted-foreground">Novos Pacientes</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col">
                  <span className="text-2xl">⭕</span>
                  <span className="text-xl font-bold mt-1">{filteredStats.inactive60}</span>
                  <span className="text-[10px] text-muted-foreground">Inativos 60d+</span>
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
              {(statusFilter !== 'all' || conditionFilter !== 'all' || searchTerm || activeAdvancedFiltersCount > 0) && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{totalCount} paciente(s) encontrado(s) no total</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleClearAllFilters}
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <PatientAdvancedFilters
          onFilterChange={handleFilterChange}
          activeFiltersCount={activeAdvancedFiltersCount}
          onClearFilters={handleClearFilters}
        />

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <PatientAnalytics
            totalPatients={patients.length}
            classificationStats={filteredStats}
          />
        )}

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
          <>
            <div className="grid gap-4 animate-fade-in">
              {filteredPatients.map((patient, index) => {
              const patientStats = statsMap[patient.id];
              const sessionsInfo = patientStats
                ? `${patientStats.sessionsCompleted} sessão${patientStats.sessionsCompleted !== 1 ? 'ões' : ''}`
                : null;
              const firstEvaluationInfo = patientStats?.firstEvaluationDate
                ? `Prim. aval.: ${formatFirstEvaluationDate(patientStats.firstEvaluationDate)}`
                : null;

              return (
                <LazyComponent
                  key={patient.id}
                  placeholder={<div className="h-[90px] w-full bg-muted/50 rounded-xl animate-pulse" />}
                  rootMargin="200px"
                >
                  <Card
                    className="group flex items-center gap-4 p-3 rounded-xl bg-card hover:bg-slate-50 dark:hover:bg-slate-800/50 active:bg-slate-100 dark:active:bg-slate-800 transition-colors border border-transparent hover:border-border dark:hover:border-slate-700"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <Avatar className="h-12 w-12 ring-2 ring-border dark:ring-slate-700 shrink-0">
                            <AvatarFallback className={cn(
                              "text-sm font-bold",
                              patient.status === 'Em Tratamento'
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                : patient.status === 'Inicial'
                                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {PatientHelpers.getName(patient) || 'Paciente sem nome'}
                            </p>
                            <Badge className={cn(
                              "inline-flex items-center rounded-full border border-transparent text-[10px] font-semibold px-2 py-0.5",
                              patient.status === 'Em Tratamento'
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                : patient.status === 'Inicial'
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            )}>
                              {patient.status || 'Inicial'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {patient.phone || patient.email || `${calculateAge(patient.birth_date)} anos`}
                          </p>

                          {/* Informações adicionais de sessões e primeira avaliação */}
                          {(sessionsInfo || firstEvaluationInfo) && (
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              {sessionsInfo && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {sessionsInfo}
                                </span>
                              )}
                              {firstEvaluationInfo && (
                                <span className="truncate">{firstEvaluationInfo}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0">
                      <PatientActions patient={patient} />
                    </div>
                  </Card>
                </LazyComponent>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6" role="navigation" aria-label="Navegação de páginas de pacientes">
              <Pagination>
                <PaginationContent aria-label={`Página ${currentPage} de ${totalPages}`}>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => previousPage()}
                      className={!hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      aria-label="Ir para página anterior"
                      aria-disabled={!hasPreviousPage}
                    />
                  </PaginationItem>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => goToPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                          aria-label={`Ir para página ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <PaginationItem aria-hidden="true">
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => nextPage()}
                      className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      aria-label="Ir para próxima página"
                      aria-disabled={!hasNextPage}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
        )}
      </div>
      <PatientCreateModal
        open={isNewPatientModalOpen}
        onOpenChange={setIsNewPatientModalOpen}
      />
    </MainLayout>
  );
};

export default Patients;
