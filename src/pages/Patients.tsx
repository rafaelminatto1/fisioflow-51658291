import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
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
  PatientsPageHeader,
  countActiveFilters,
  matchesFilters,
  type PatientFilters
} from '@/components/patients';
import { usePatientsPaginated } from '@/hooks/usePatientCrud';
import { usePatientsPostgres } from '@/hooks/useDataConnect';
import { useMultiplePatientStats, formatFirstEvaluationDate } from '@/hooks/usePatientStats';
import { PatientHelpers } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Users, ChevronRight, Calendar } from 'lucide-react';
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
  const debouncedSearch = useDebounce(searchTerm, 300);
  // const [currentPage, setCurrentPage] = useState(1); // Manage state in hook now
  const pageSize = 20;

  // --- DATA CONNECT (POSTGRES) IMPLEMENTATION ---
  /* DATA CONNECT (POSTGRES) IMPLEMENTATION - TEMPORARILY DISABLED
  const { data: allPatientsPostgres, isLoading: loadingPostgres } = usePatientsPostgres(organizationId);
  
  // Filtragem no cliente (extremamente rápida para < 1000 pacientes)
  const filteredAllPatients = useMemo(() => {
    if (!allPatientsPostgres) return [];
    return allPatientsPostgres.filter((p: any) => {
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = !debouncedSearch || 
        p.name.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.phone?.includes(searchLower);
        
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [allPatientsPostgres, debouncedSearch, statusFilter]);

  // Paginação no cliente
  const totalCount = filteredAllPatients.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const patients = filteredAllPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  const loading = loadingPostgres;

  const goToPage = (page: number) => setCurrentPage(page);
  const nextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  const previousPage = () => setCurrentPage(p => Math.max(1, p - 1));
  */

  // LEGACY FIRESTORE PAGINATION (Restored)
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
    // currentPage managed internally by the hook
  });

  // Sync hook page with local state if needed, or rely on hook's rendering
  // Ideally usePatientsPaginated handles page state internally via the hook param? 
  // Checking the hook source: it takes initialPage but manages state internally.
  // Wait, looking at src/hooks/usePatientCrud.ts: 
  // It returns currentPage and goToPage. 
  // BUT in Patients.tsx line 68: const [currentPage, setCurrentPage] = useState(1);
  // We need to decide who owns the state. 
  // The 'usePatientsPaginated' hook manages its own 'currentPage' state if we don't lift it up properly 
  // OR the current usage in Patients.tsx line 68 might conflict.

  // Let's verify 'usePatientsPaginated' implementation again from previous turn...
  // It has: const [currentPage, setCurrentPage] = useState(initialPage);
  // So the hook owns the state.
  // We should remove the local 'currentPage' state in Patients.tsx OR sync them.
  // The simplest way to restore is to use the variables returned from the hook.
  // Note: 'currentPage' variable name collision.
  // We commented out the local pagination logic above, so 'patients' variable is free.
  // But 'currentPage' on line 68 is still there. 
  // Check line 68 removal needs.

  // Buscar estatísticas de múltiplos pacientes
  const patientIds = useMemo(() => patients.map(p => p.id), [patients]);
  const { data: statsMap = {} } = useMultiplePatientStats(patientIds);

  const navigate = useNavigate();

  // Reset to page 1 when filters change
  useEffect(() => {
    goToPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const headerStats = {
    totalCount,
    currentPage,
    totalPages,
    activeCount: patients.filter((p) => p.status === 'Em Tratamento').length,
    newCount: patients.filter((p) => p.status === 'Inicial').length,
    completedCount: patients.filter((p) => p.status === 'Concluído').length,
    inactive7: filteredStats.inactive7,
    inactive30: filteredStats.inactive30,
    inactive60: filteredStats.inactive60,
    noShowRisk: filteredStats.noShowRisk,
    hasUnpaid: filteredStats.hasUnpaid,
    newPatients: filteredStats.newPatients,
  };

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in pb-20 sm:space-y-5 md:pb-0">
        <PatientsPageHeader
          stats={headerStats}
          onNewPatient={() => setIsNewPatientModalOpen(true)}
          onExport={exportPatients}
          onToggleAnalytics={() => setShowAnalytics(!showAnalytics)}
          showAnalytics={showAnalytics}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          conditionFilter={conditionFilter}
          onConditionFilterChange={setConditionFilter}
          uniqueConditions={uniqueConditions}
          activeAdvancedFiltersCount={activeAdvancedFiltersCount}
          totalFilteredLabel={
            statusFilter !== 'all' || conditionFilter !== 'all' || searchTerm || activeAdvancedFiltersCount > 0
              ? `${totalCount} paciente(s) encontrado(s) no total`
              : undefined
          }
          onClearAllFilters={handleClearAllFilters}
          hasActiveFilters={
            statusFilter !== 'all' || conditionFilter !== 'all' || !!searchTerm || activeAdvancedFiltersCount > 0
          }
        >
          <IncompleteRegistrationAlert />
        </PatientsPageHeader>

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
