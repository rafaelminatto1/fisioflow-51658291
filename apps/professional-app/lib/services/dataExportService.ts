import { fetchApi } from "@/lib/api";
import { fisioLogger } from "../errors/logger";

export type ExportFormat = "json" | "pdf" | "csv";

export interface ExportRequest {
  format: ExportFormat;
  dateRange?: {
    start: Date;
    end: Date;
  };
  types: ("appointments" | "evolutions" | "exercises" | "profile")[];
}

class DataExportService {
  private static instance: DataExportService;

  private constructor() {}

  static getInstance(): DataExportService {
    if (!DataExportService.instance) {
      DataExportService.instance = new DataExportService();
    }
    return DataExportService.instance;
  }

  /**
   * Registra o pedido de portabilidade (LGPD art. 18 V/VI).
   *
   * Path: `/api/lgpd/data-export-request`. Até 08/2026 isto chamava `/api/export`,
   * rota inexistente — a tela dizia "sua solicitação está sendo processada" e o
   * pedido não era gravado em lugar nenhum.
   */
  async requestExport(request: ExportRequest): Promise<{ status: string; url?: string }> {
    try {
      const response = await fetchApi<{
        data: { status: string; result_url?: string; response_summary?: string };
      }>("/api/lgpd/data-export-request", {
        method: "POST",
        data: {
          format: request.format,
          types: request.types,
          dateRange: request.dateRange
            ? {
                start: request.dateRange.start.toISOString().split("T")[0],
                end: request.dateRange.end.toISOString().split("T")[0],
              }
            : undefined,
          request_origin: "professional_app",
        },
      });

      return {
        status: response.data?.status ?? "received",
        url: response.data?.result_url,
      };
    } catch (error) {
      fisioLogger.error("Export request failed", error, "DataExportService");
      throw error;
    }
  }
}

export const dataExportService = DataExportService.getInstance();
