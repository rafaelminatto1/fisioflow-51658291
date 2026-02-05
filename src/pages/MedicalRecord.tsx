/**
 * Medical Record (Prontuário Eletrônico) - Hub de prontuários
 * Lista pacientes e navega para o prontuário completo em /patients/:id
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/performance/useDebounce';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { usePatientsPaginated, type Patient } from '@/hooks/usePatientCrud';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Search, ChevronRight, Users } from 'lucide-react';

export default function MedicalRecord() {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id ?? null;
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

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
    isLoading,
  } = usePatientsPaginated({
    organizationId,
    status: null,
    searchTerm: debouncedSearch,
    pageSize: 20,
  });

  useEffect(() => {
    goToPage(1);
  }, [debouncedSearch]);

  const handleViewRecord = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Prontuário Eletrônico
          </h1>
          <p className="text-muted-foreground mt-1">
            Acesse o prontuário completo de cada paciente. Evoluções, anamnese e dados clínicos ficam no perfil do paciente.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pacientes
            </CardTitle>
            <CardDescription>
              Busque pelo nome e clique em &quot;Ver prontuário&quot; para abrir evoluções e dados clínicos.
            </CardDescription>
            <div className="pt-2">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pacientes por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton type="list" rows={8} />
            ) : patients.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum paciente encontrado"
                description={
                  searchTerm
                    ? 'Tente outro termo de busca ou cadastre um novo paciente.'
                    : 'Cadastre pacientes para acessar os prontuários.'
                }
                action={
                  !searchTerm
                    ? { label: 'Cadastrar paciente', onClick: () => navigate('/patients/new') }
                    : { label: 'Limpar busca', onClick: () => setSearchTerm('') }
                }
              />
            ) : (
              <>
                <ul className="divide-y divide-border rounded-md border">
                  {patients.map((patient: Patient) => (
                    <li key={patient.id}>
                      <div className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{patient.full_name || patient.name}</p>
                          {(patient.main_condition || patient.email) && (
                            <p className="text-sm text-muted-foreground truncate">
                              {[patient.main_condition, patient.email].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => handleViewRecord(patient.id)}
                        >
                          Ver prontuário
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {totalPages > 1 && (
                  <Pagination className="mt-4">
                    <PaginationContent>
                      <PaginationItem>
                        <button
                          onClick={() => {
                            if (hasPreviousPage) previousPage();
                          }}
                          disabled={!hasPreviousPage}
                          className={!hasPreviousPage
                            ? 'pointer-events-none opacity-50 flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                            : 'flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer'
                          }
                          aria-label="Página anterior"
                        >
                          <ChevronRight className="h-4 w-4 rotate-180" />
                        </button>
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        return (
                          <PaginationItem key={pageNum}>
                            <button
                              onClick={() => goToPage(pageNum)}
                              aria-label={`Ir para página ${pageNum}`}
                              aria-current={currentPage === pageNum ? 'page' : undefined}
                              className={currentPage === pageNum
                                ? 'flex h-9 w-9 items-center justify-center rounded-md border border-input bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                              }
                            >
                              {pageNum}
                            </button>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <button
                          onClick={() => {
                            if (hasNextPage) nextPage();
                          }}
                          disabled={!hasNextPage}
                          className={!hasNextPage
                            ? 'pointer-events-none opacity-50 flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground'
                            : 'flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer'
                          }
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {totalCount} {totalCount === 1 ? 'paciente' : 'pacientes'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
