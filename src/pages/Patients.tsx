import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmptyState, EmptyStateEnhanced } from '@/components/ui';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { IncompleteRegistrationAlert } from '@/components/dashboard/IncompleteRegistrationAlert';
// ============================================================================
// NOVOS COMPONENTES
// ============================================================================
import { QuickFilters } from '@/components/schedule/QuickFilters';
import { DebouncedSearch } from '@/components/schedule/DebouncedSearch';
import { ThemeProvider, useTheme } from '@/components/ui/theme';
import { SkipLinks } from '@/components/ui/accessibility/SkipLinks';
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
  PatientPageInsights,
  PatientsPageHeader,
  countActiveFilters,
  matchesFilters,
  type PatientFilters
} from '@/components/patients';
import { PatientCard } from '@fisioflow/ui';
import { usePatientsPaginated } from '@/hooks/usePatientCrud';
import { useMultiplePatientStats } from '@/hooks/usePatientStats';
import { PatientHelpers } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { calculateAge, exportToCSV } from '@/lib/utils';
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
  const pageSize = 20;

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

  // Buscar estatísticas de múltiplos pacientes
  const patientIds = useMemo(() => patients.map(p => p.id), [patients]);
  const { data: statsMap = {} } = useMultiplePatientStats(patientIds);

  const navigate = useNavigate();

  // Reset to page 1 quando filtros mudam
  useEffect(() => {
    goToPage(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, debouncedSearch, conditionFilter, advancedFilters.classification]);

  // Get unique conditions and statuses for filters (from current page)
  const uniqueConditions = useMemo(() => {
    const conditions = [...new Set(patients.map(p => p.main_condition).filter((c): c is string => !!c))];
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

  const handleClassificationFilterChange = (classification: PatientFilters['classification']) => {
    setAdvancedFilters(prev => ({
      ...prev,
      classification: classification === 'all' ? undefined : classification
    }));
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
    activeByClassification: filteredStats.active,
    inactive7: filteredStats.inactive7,
    inactive30: filteredStats.inactive30,
    inactive60: filteredStats.inactive60,
    noShowRisk: filteredStats.noShowRisk,
    hasUnpaid: filteredStats.hasUnpaid,
    newPatients: filteredStats.newPatients,
  };

  return (
    <MainLayout>
      <div className="space-y-4 animate-fade-in pb-20 sm:space-y-5 md:pb-0" data-testid="patients-page">
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
              ? advancedFilters.classification
                ? `${filteredPatients.length} nesta página (filtro: classificação)`
                : `${totalCount} encontrado(s)`
              : undefined
          }
          onClearAllFilters={handleClearAllFilters}
          hasActiveFilters={
            statusFilter !== 'all' || conditionFilter !== 'all' || !!searchTerm || activeAdvancedFiltersCount > 0
          }
          classificationFilter={advancedFilters.classification ?? 'all'}
          onClassificationFilterChange={handleClassificationFilterChange}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn("h-10 w-10 shrink-0", activeAdvancedFiltersCount > 0 && "border-primary bg-primary/5 text-primary")}
                title="Filtros avançados"
              >
                <div className="relative">
                  <Filter className="h-4 w-4" />
                  {activeAdvancedFiltersCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] text-primary-foreground font-bold">
                      {activeAdvancedFiltersCount}
                    </span>
                  )}
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="end">
              <PatientAdvancedFilters
                onFilterChange={handleFilterChange}
                activeFiltersCount={activeAdvancedFiltersCount}
                onClearFilters={handleClearFilters}
              />
            </PopoverContent>
          </Popover>
        </PatientsPageHeader>

        <IncompleteRegistrationAlert />

        <PatientPageInsights
          totalPatients={filteredPatients.length}
          classificationStats={filteredStats}
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
            title={
              searchTerm || statusFilter !== 'all' || conditionFilter !== 'all' || activeAdvancedFiltersCount > 0
                ? 'Nenhum paciente encontrado'
                : 'Nenhum paciente cadastrado'
            }
            description={
              searchTerm || statusFilter !== 'all' || conditionFilter !== 'all' || activeAdvancedFiltersCount > 0
                ? 'Nenhum paciente corresponde aos filtros aplicados. Tente ajustar ou limpar os filtros.'
                : 'Comece adicionando seu primeiro paciente.'
            }
            action={
              searchTerm || statusFilter !== 'all' || conditionFilter !== 'all' || activeAdvancedFiltersCount > 0
                ? { label: 'Limpar filtros', onClick: handleClearAllFilters }
                : { label: 'Novo Paciente', onClick: () => setIsNewPatientModalOpen(true) }
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" data-testid="patient-list">
              {filteredPatients.map((patient, index) => {
                const patientStats = statsMap[patient.id];
                const patientName = PatientHelpers.getName(patient);
                
                return (
                  <LazyComponent
                    key={patient.id}
                    placeholder={<div className="h-[140px] w-full bg-muted/50 rounded-xl animate-pulse" />}
                    rootMargin="200px"
                  >
                    <PatientCard
                      name={patientName || 'Sem Nome'}
                      condition={patient.main_condition}
                      status={patient.status}
                      stats={{
                        sessionsCompleted: patientStats?.sessionsCompleted || 0,
                        nextAppointment: patientStats?.nextAppointmentDate ? new Date(patientStats.nextAppointmentDate).toLocaleDateString('pt-BR') : undefined
                      }}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      actions={<PatientActions patient={patient} />}
                      className="h-full"
                    />
                  </LazyComponent>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6" role="navigation" aria-label="Navegação de páginas de pacientes">
                <p className="text-sm text-muted-foreground order-2 sm:order-1">
                  Mostrando {((currentPage - 1) * pageSize) + 1}–
                  {Math.min(currentPage * pageSize, totalCount)} de {totalCount}
                </p>
                <Pagination className="order-1 sm:order-2">
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
            {totalPages <= 1 && filteredPatients.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {filteredPatients.length} paciente(s) na lista
              </p>
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
