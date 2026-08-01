// ============================================================================
// DOCUMENTAÇÃO E DIRETRIZES PARA DESENVOLVEDORES E LLMs:
// Consulte o guia detalhado em: docs/clinical-tests.md antes de alterar este arquivo.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  Layers3,
  Plus,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";

import { ClinicalTestDeleteDialog } from "@/components/clinical/ClinicalTestDeleteDialog";
import { ClinicalTestDetailsModal } from "@/components/clinical/ClinicalTestDetailsModal";
import { ClinicalTestFormModal } from "@/components/clinical/ClinicalTestFormModal";
import { ClinicalTestProtocolDialog } from "@/components/clinical/ClinicalTestProtocolDialog";
import { ClinicalTestsFilter } from "@/components/clinical/ClinicalTestsFilter";
import { ClinicalTestsGrid } from "@/components/clinical/ClinicalTestsGrid";
import { PageLayout, PageContainer } from "@/components/layout/PageLayout";
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
import {
  expandSearchQuery,
  normalizeForSearch,
} from "@/lib/utils/bilingualSearch";
import { diagnosticClusters } from "@/data/clinicalClusters";

type ClinicalTest = ClinicalTestCatalogRecord;

export default function ClinicalTestsLibrary() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [selectedTest, setSelectedTest] = useState<ClinicalTest | null>(null);

  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, activeFilter, selectedClusterId]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (
        event.key !== "/" ||
        isEditing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

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

  const tests = useMemo(
    () => mergeClinicalTestsCatalog(remoteTests),
    [remoteTests],
  );

  const catalogStats = useMemo(
    () => ({
      total: tests.length,
      orthopedic: tests.filter((test) => test.category === "Ortopedia").length,
      sports: tests.filter((test) => test.category === "Esportiva").length,
      postOperative: tests.filter((test) => test.category === "Pós-Operatório")
        .length,
    }),
    [tests],
  );

  const filteredTests = useMemo(() => {
    const normalizedSearch = normalizeClinicalTestName(searchTerm);
    const expandedTerms =
      searchTerm.length >= 2 ? expandSearchQuery(searchTerm) : [];
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
      if (selectedClusterId) return test.cluster_id === selectedClusterId;
      if (activeFilter === "Todos") return true;
      if (categorySet.has(activeFilter)) return test.category === activeFilter;
      return test.target_joint === activeFilter;
    });
  }, [activeFilter, searchTerm, selectedClusterId, tests]);

  const handleStructuredFilterChange = (filter: string) => {
    setSelectedClusterId(null);
    setActiveFilter(filter);
  };

  const handleClusterChange = (clusterId: string) => {
    setActiveFilter("Todos");
    setSelectedClusterId((current) =>
      current === clusterId ? null : clusterId,
    );
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setActiveFilter("Todos");
    setSelectedClusterId(null);
  };

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
      toast.info(
        "Duplique o teste para personalizar antes de vinculá-lo a um protocolo.",
      );
      return;
    }

    setSelectedTest(test);
    setProtocolDialogOpen(true);
  };

  const confirmAddToProtocol = (protocolId: string) => {
    if (!selectedTest) return;

    const protocol = protocols.find((item) => item.id === protocolId);
    if (!protocol) return;

    const currentTests = Array.isArray(protocol.clinical_tests)
      ? protocol.clinical_tests
      : [];

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
        <div className="-mx-2 min-h-screen bg-background text-foreground xs:-mx-4 md:mx-0">
          <main className="px-3 pb-24 pt-2 sm:px-4">
            <div className="space-y-4">
              <header className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">
                    Clínica · Catálogo e calculadoras
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-[28px]">
                    Biblioteca de Testes Clínicos
                  </h1>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
                    <span>
                      <b className="font-black tabular-nums text-slate-900">
                        {catalogStats.total}
                      </b>{" "}
                      testes
                    </span>
                    <span>
                      <b className="font-black tabular-nums text-slate-900">
                        {catalogStats.orthopedic}
                      </b>{" "}
                      ortopedia
                    </span>
                    <span>
                      <b className="font-black tabular-nums text-slate-900">
                        {catalogStats.sports}
                      </b>{" "}
                      esportiva
                    </span>
                    <span>
                      <b className="font-black tabular-nums text-slate-900">
                        {catalogStats.postOperative}
                      </b>{" "}
                      pós-op
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleCreateNew}
                  size="sm"
                  className="min-h-10 shrink-0 gap-1.5 rounded-xl bg-sky-500 px-4 font-extrabold shadow-[0_8px_18px_rgba(14,165,233,0.22)] hover:bg-sky-600"
                >
                  <Plus className="h-4 w-4" />
                  Novo teste
                </Button>
              </header>

              {isError ? (
                <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-card px-5 py-4 shadow-none">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Não foi possível sincronizar os testes salvos
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      A biblioteca clínica curada segue disponível abaixo. Tente
                      novamente para recuperar os testes personalizados da
                      clínica.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => refetch()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : null}

              <ClinicalTestsFilter
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeFilter={selectedClusterId ? "" : activeFilter}
                onFilterChange={handleStructuredFilterChange}
                categories={clinicalTestCategoryOptions}
                joints={clinicalTestJointOptions}
                totalCount={tests.length}
                filteredCount={filteredTests.length}
                inputRef={searchInputRef}
              />

              <section
                aria-labelledby="clusters-title"
                className="grid gap-2.5 lg:grid-cols-[auto_1fr] lg:items-stretch"
              >
                <div className="flex items-center gap-2 px-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 lg:w-24 lg:flex-col lg:items-start lg:justify-center">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Layers3 className="h-4 w-4" />
                  </span>
                  <span id="clusters-title">Clusters</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                  {diagnosticClusters.map((cluster) => {
                    const active = selectedClusterId === cluster.id;
                    const rule =
                      cluster.logic === "min_count" &&
                      cluster.min_count_required
                        ? `positivo com ${cluster.min_count_required}+`
                        : cluster.logic === "all"
                          ? "todos positivos"
                          : "qualquer positivo";

                    return (
                      <button
                        key={cluster.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleClusterChange(cluster.id)}
                        className={`group flex min-h-[76px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[transform,border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${
                          active
                            ? "border-violet-400 bg-violet-50 shadow-[0_8px_20px_rgba(124,58,237,0.12)]"
                            : "border-violet-200/80 bg-violet-50/40 hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50"
                        }`}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                          <Layers3 className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-xs font-black leading-4 text-slate-800">
                            {cluster.name}
                          </span>
                          <span className="mt-1 block truncate text-[10px] font-bold text-slate-500">
                            {cluster.tests.length} testes · {rule}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-violet-400 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="grid gap-2.5 lg:grid-cols-[1fr_auto]">
                <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      <BookOpenCheck className="h-3.5 w-3.5" />
                      Curadoria clínica
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      Evidência, imagens e materiais de apoio no ponto de uso.
                    </p>
                  </div>
                </div>

                <div className="flex items-center rounded-xl border border-slate-200/80 bg-white px-4 py-3">
                  <div className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-bold text-slate-500">
                    <ScrollText className="h-4 w-4 text-sky-600" />
                    Mostrando{" "}
                    <b className="font-black tabular-nums text-slate-900">
                      {Math.min(visibleCount, filteredTests.length)}
                    </b>{" "}
                    de{" "}
                    <b className="font-black tabular-nums text-slate-900">
                      {filteredTests.length}
                    </b>
                  </div>
                </div>
              </section>

              <ClinicalTestsGrid
                isLoading={isLoading}
                tests={filteredTests.slice(0, visibleCount)}
                onSelectTest={setSelectedTest}
                onClearFilters={clearAllFilters}
              />

              {filteredTests.length > visibleCount && (
                <div
                  ref={sentinelRef}
                  className="mt-4 flex h-10 items-center justify-center"
                  aria-label="Carregando mais testes"
                >
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-b-sky-500" />
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
