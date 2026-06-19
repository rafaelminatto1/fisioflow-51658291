// ============================================================================
// DOCUMENTAÇÃO E DIRETRIZES PARA DESENVOLVEDORES E LLMs:
// Consulte o guia detalhado em: docs/clinical-tests.md antes de alterar este arquivo.
// ============================================================================

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BookOpenCheck, Plus, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { ClinicalTestDeleteDialog } from "@/components/clinical/ClinicalTestDeleteDialog";
import { ClinicalTestDetailsModal } from "@/components/clinical/ClinicalTestDetailsModal";
import { ClinicalTestFormModal } from "@/components/clinical/ClinicalTestFormModal";
import { ClinicalTestProtocolDialog } from "@/components/clinical/ClinicalTestProtocolDialog";
import { ClinicalTestsFilter } from "@/components/clinical/ClinicalTestsFilter";
import { ClinicalTestsGrid } from "@/components/clinical/ClinicalTestsGrid";
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useExerciseProtocols } from "@/hooks/useExerciseProtocols";
import { clinicalTestsApi, type ClinicalTestTemplateRecord } from "@/api/v2";
import {
  clinicalTestCategoryOptions,
  clinicalTestJointOptions,
  mergeClinicalTestsCatalog,
  normalizeClinicalTestName,
  type ClinicalTestCatalogRecord,
} from "@/data/clinicalTestsCatalog";
import { expandSearchQuery, normalizeForSearch } from "@/lib/utils/bilingualSearch";

type ClinicalTest = ClinicalTestCatalogRecord;

export default function ClinicalTestsLibrary() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(null);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, activeFilter]);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 12);
        }
      },
      { threshold: 0.1 },
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, []);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [testToEdit, setTestToEdit] = useState<ClinicalTest | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<ClinicalTest | null>(null);
  const [protocolDialogOpen, setProtocolDialogOpen] = useState(false);
  const { protocols, updateProtocol } = useExerciseProtocols();

  const {
    data: remoteTests = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["clinical-tests-library"],
    queryFn: async () => {
      const res = await clinicalTestsApi.list();
      return (res?.data ?? []) as ClinicalTestTemplateRecord[];
    },
  });

  const tests = useMemo(() => mergeClinicalTestsCatalog(remoteTests), [remoteTests]);

  const filteredTests = useMemo(() => {
    const normalizedSearch = normalizeClinicalTestName(searchTerm);
    const expandedTerms = searchTerm.length >= 2 ? expandSearchQuery(searchTerm) : [];
    const categorySet = new Set<string>(clinicalTestCategoryOptions);

    return tests.filter((test) => {
      const fieldValues = [
        test.name,
        test.name_en,
        test.target_joint,
        test.category,
        test.purpose,
        ...(test.tags ?? []),
      ];

      let matchesSearch = normalizedSearch.length === 0;

      if (!matchesSearch) {
        // Standard search
        matchesSearch = fieldValues.some((value) =>
          normalizeClinicalTestName(value).includes(normalizedSearch),
        );
      }

      if (!matchesSearch && expandedTerms.length > 1) {
        // Bilingual expanded search (synonym matching)
        const normalizedFields = fieldValues
          .filter((v): v is string => !!v)
          .map(normalizeForSearch);
        matchesSearch = expandedTerms.some((term) =>
          normalizedFields.some((field) => field.includes(term)),
        );
      }

      if (!matchesSearch) return false;
      if (activeFilter === "Todos") return true;
      if (categorySet.has(activeFilter)) return test.category === activeFilter;
      return test.target_joint === activeFilter;
    });
  }, [activeFilter, searchTerm, tests]);

  const deleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      await clinicalTestsApi.delete(testId);
    },
    onSuccess: () => {
      toast.success("Teste excluído com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["clinical-tests-library"] });
      setDeleteDialogOpen(false);
      setTestToDelete(null);
      setSelectedTest(null);
    },
    onError: () => {
      toast.error("Erro ao excluir teste.");
    },
  });

  const handleCreateNew = () => {
    setTestToEdit(null);
    setFormMode("create");
    setFormModalOpen(true);
  };

  const handleEdit = (test: ClinicalTest) => {
    setTestToEdit(test);
    setFormMode(test.is_builtin ? "create" : "edit");
    setFormModalOpen(true);
    setSelectedTest(null);
  };

  const handleDeleteConfirm = () => {
    if (!testToDelete?.id) return;
    deleteMutation.mutate(testToDelete.id);
  };

  const handleAddToProtocol = (test: ClinicalTest) => {
    if (test.is_builtin) {
      toast.info("Duplique o teste para personalizar antes de vinculá-lo a um protocolo.");
      return;
    }

    setSelectedTest(test);
    setProtocolDialogOpen(true);
  };

  const confirmAddToProtocol = (protocolId: string) => {
    if (!selectedTest) return;

    const protocol = protocols.find((item) => item.id === protocolId);
    if (!protocol) return;

    const currentTests = Array.isArray(protocol.clinical_tests) ? protocol.clinical_tests : [];

    if (currentTests.includes(selectedTest.id)) {
      toast.info("Este teste já está vinculado a este protocolo.");
      return;
    }

    updateProtocol({
      id: protocolId,
      clinical_tests: [...currentTests, selectedTest.id],
    });

    setProtocolDialogOpen(false);
    toast.success(`Teste adicionado ao protocolo ${protocol.name}.`);
  };

  return (
    <PageLayout>
      <PageContainer>
        <PageHeader title="Biblioteca de Testes Clínicos" />
        <div className="-mx-2 min-h-screen bg-slate-50 text-slate-800 xs:-mx-4 md:mx-0">
          <main className="px-4 py-4 pb-24">
            <div className="space-y-4">
              {/* Compact header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Button onClick={handleCreateNew} size="sm" className="gap-1.5 flex-shrink-0">
                  <Plus className="h-4 w-4" />
                  Novo teste
                </Button>
              </div>

              {isError ? (
                <div className="flex items-start gap-4 rounded-[28px] border border-red-100 bg-white px-5 py-4 shadow-sm">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Não foi possível sincronizar os testes salvos
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      A biblioteca clínica curada segue disponível abaixo. Tente novamente para
                      recuperar os testes personalizados da clínica.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-teal-200 text-teal-700 hover:bg-teal-50"
                    onClick={() => refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : null}

              <ClinicalTestsFilter
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                categories={clinicalTestCategoryOptions}
                joints={clinicalTestJointOptions}
                totalCount={tests.length}
                filteredCount={filteredTests.length}
              />

              <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                      <BookOpenCheck className="h-4 w-4" />
                      Curadoria clínica
                    </div>
                    <p className="text-sm text-slate-600">
                      Testes built-in exibem evidência, imagens e materiais de apoio. Testes
                      personalizados continuam editáveis e podem ser vinculados aos protocolos.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
                    <ScrollText className="h-4 w-4 text-teal-600" />
                    {filteredTests.length} resultados visíveis
                  </div>
                </div>
              </section>

              <ClinicalTestsGrid
                isLoading={isLoading}
                tests={filteredTests.slice(0, visibleCount)}
                onSelectTest={setSelectedTest}
                onClearFilters={() => {
                  setSearchTerm("");
                  setActiveFilter("Todos");
                }}
              />

              {filteredTests.length > visibleCount && (
                <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                </div>
              )}
            </div>
          </main>

          <ClinicalTestDetailsModal
            test={selectedTest}
            isOpen={!!selectedTest}
            onClose={() => setSelectedTest(null)}
            onEdit={handleEdit}
            onDelete={(test) => {
              if (test.is_builtin) return;
              setTestToDelete(test);
              setDeleteDialogOpen(true);
            }}
            onAddToProtocol={handleAddToProtocol}
          />

          <ClinicalTestFormModal
            open={formModalOpen}
            onOpenChange={setFormModalOpen}
            test={testToEdit}
            mode={formMode}
          />

          <ClinicalTestDeleteDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            testName={testToDelete?.name}
            onConfirm={handleDeleteConfirm}
          />

          <ClinicalTestProtocolDialog
            isOpen={protocolDialogOpen}
            onClose={() => setProtocolDialogOpen(false)}
            protocols={protocols}
            isLoading={isLoading}
            testName={selectedTest?.name}
            onConfirm={confirmAddToProtocol}
          />
        </div>
      </PageContainer>
    </PageLayout>
  );
}
