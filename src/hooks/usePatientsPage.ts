import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { patientsApi, type PatientsListFacets, type PatientsListSummary } from "@/api/v2/patients";
import { useAuth } from "@/hooks/useAuth";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { invalidatePatientsComprehensive } from "@/utils/cacheInvalidation";
import type { PatientRow } from "@/types/workers";

export interface PatientsFilters {
  search?: string;
  status?: string;
  condition?: string;
  classification?: string;
  pathologies?: string[];
  pathologyStatus?: string;
  careProfiles?: string[];
  sports?: string[];
  therapyFocuses?: string[];
  paymentModel?: string;
  financialStatus?: string;
  origin?: string;
  partnerCompany?: string;
  sortBy?: string;
  hasSurgery?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PatientsPageData {
  patients: PatientRow[];
  totalCount: number;
  statsMap: Record<string, never>;
  uniqueConditions: string[];
  summary: PatientsListSummary;
  facets: PatientsListFacets;
}

const EMPTY_SUMMARY: PatientsListSummary = {
  total: 0,
  active: 0,
  newPatients: 0,
  atRisk: 0,
  completed: 0,
  inactive7: 0,
  inactive30: 0,
  inactive60: 0,
  noShowRisk: 0,
  hasUnpaid: 0,
};

const EMPTY_FACETS: PatientsListFacets = {
  pathologies: [],
  careProfiles: [],
  sports: [],
  therapyFocuses: [],
  origins: [],
  partners: [],
};

export function usePatientsPageData(filters: PatientsFilters = {}) {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  const {
    search = "",
    status = "all",
    condition = "all",
    classification = "all",
    pathologies = [],
    pathologyStatus = "all",
    careProfiles = [],
    sports = [],
    therapyFocuses = [],
    paymentModel = "all",
    financialStatus = "all",
    origin = "all",
    partnerCompany = "all",
    sortBy = "created_at_desc",
    hasSurgery = false,
    page = 1,
    pageSize = 20,
  } = filters;

  const {
    data: patientsResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      "patients-list",
      search,
      status,
      condition,
      classification,
      pathologies,
      pathologyStatus,
      careProfiles,
      sports,
      therapyFocuses,
      paymentModel,
      financialStatus,
      origin,
      partnerCompany,
      sortBy,
      hasSurgery,
      page,
      pageSize,
    ],
    queryFn: async () => {
      try {
        return await patientsApi.list({
          status: status === "all" ? undefined : status,
          search: search || undefined,
          sortBy: sortBy as PatientsFilters["sortBy"],
          condition: condition === "all" ? undefined : condition,
          classification: classification === "all" ? undefined : classification,
          pathologies: pathologies.length > 0 ? pathologies : undefined,
          pathologyStatus: pathologyStatus === "all" ? undefined : pathologyStatus,
          careProfiles: careProfiles.length > 0 ? careProfiles : undefined,
          sports: sports.length > 0 ? sports : undefined,
          therapyFocuses: therapyFocuses.length > 0 ? therapyFocuses : undefined,
          paymentModel: paymentModel === "all" ? undefined : paymentModel,
          financialStatus: financialStatus === "all" ? undefined : financialStatus,
          origin: origin === "all" ? undefined : origin,
          partnerCompany: partnerCompany === "all" ? undefined : partnerCompany,
          hasSurgery: hasSurgery || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        });
      } catch (queryError) {
        logger.error("Error loading patients", { error: queryError, filters }, "usePatientsPage");
        throw queryError;
      }
    },
    enabled: Boolean(organizationId),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });

  const patients = patientsResponse?.data ?? [];
  const totalCount = patientsResponse?.total ?? 0;
  const summary = patientsResponse?.summary ?? EMPTY_SUMMARY;
  const facets = patientsResponse?.facets ?? EMPTY_FACETS;

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PatientRow>) => {
      const res = await patientsApi.create(data);
      return res?.data ?? res;
    },
    onSuccess: async () => {
      await invalidatePatientsComprehensive(queryClient);
      toast.success("Paciente criado com sucesso");
    },
    onError: (mutationError) => {
      logger.error("Error creating patient", { error: mutationError }, "usePatientsPage");
      toast.error("Erro ao criar paciente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; patient: Partial<PatientRow> }) => {
      const res = await patientsApi.update(data.id, data.patient);
      return res?.data ?? res;
    },
    onSuccess: async (_, variables) => {
      await invalidatePatientsComprehensive(queryClient, variables.id);
      toast.success("Paciente atualizado com sucesso");
    },
    onError: (mutationError) => {
      logger.error("Error updating patient", { error: mutationError }, "usePatientsPage");
      toast.error("Erro ao atualizar paciente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await patientsApi.delete(id);
    },
    onSuccess: async (_, variables) => {
      await invalidatePatientsComprehensive(queryClient, variables);
      toast.success("Paciente arquivado com sucesso");
    },
    onError: (mutationError) => {
      logger.error("Error archiving patient", { error: mutationError }, "usePatientsPage");
      toast.error("Erro ao arquivar paciente");
    },
  });

  return {
    data: {
      patients,
      totalCount,
      statsMap: {},
      uniqueConditions: facets.pathologies,
      summary,
      facets,
    } as PatientsPageData,
    mutations: {
      create: createMutation.mutateAsync,
      update: updateMutation.mutateAsync,
      delete: deleteMutation.mutateAsync,
    },
    isLoading,
    error,
    refetch: () => {
      invalidatePatientsComprehensive(queryClient);
    },
  };
}
