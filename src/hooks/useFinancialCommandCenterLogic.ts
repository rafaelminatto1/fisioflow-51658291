import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFinancialPageData, type PeriodType } from "@/hooks/useFinancialPage";
import { useFinancialCommandCenter } from "@/hooks/useFinancialCommandCenter";
import { useToast } from "@/hooks/use-toast";
import type { Transaction } from "@/hooks/useFinancial";

// Type definitions for the dashboard structure
const MAIN_TABS = ["summary", "collections", "cashflow", "billing", "documents", "performance", "commissions"] as const;
const COLLECTIONS_SUBVIEWS = ["receivables", "packages"] as const;
const BILLING_SUBVIEWS = ["operations", "payables"] as const;
const DOCUMENTS_SUBVIEWS = ["receipts", "nfse"] as const;
const PERFORMANCE_SUBVIEWS = ["analytics", "dre"] as const;

type MainTab = (typeof MAIN_TABS)[number];
type CollectionsSubview = (typeof COLLECTIONS_SUBVIEWS)[number];
type BillingSubview = (typeof BILLING_SUBVIEWS)[number];
type DocumentsSubview = (typeof DOCUMENTS_SUBVIEWS)[number];
type PerformanceSubview = (typeof PERFORMANCE_SUBVIEWS)[number];

function parsePeriod(value: string | null): PeriodType {
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "all") {
    return value;
  }
  return "monthly";
}

function parseMainTab(value: string | null): MainTab {
  if (value && MAIN_TABS.includes(value as MainTab)) {
    return value as MainTab;
  }
  return "summary";
}

export function useFinancialCommandCenterLogic() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  // State parsing from URL
  const period = parsePeriod(searchParams.get("period"));
  const activeTab = parseMainTab(searchParams.get("tab"));
  
  const collectionsSubview = (searchParams.get("collections") as CollectionsSubview) || "receivables";
  const billingSubview = (searchParams.get("billing") as BillingSubview) || "operations";
  const documentsSubview = (searchParams.get("documents") as DocumentsSubview) || "receipts";
  const performanceSubview = (searchParams.get("performance") as PerformanceSubview) || "analytics";
  
  const shouldAutoOpenReceipt = searchParams.get("receiptAction") === "new";
  const shouldAutoOpenNfse = searchParams.get("nfseAction") === "new";

  // Data fetching
  const { data: pageData, mutations, isLoading: isSubmitting } = useFinancialPageData(period);
  const { data: commandCenter, isLoading: isLoadingCommandCenter } = useFinancialCommandCenter(period);
  const { transactions, stats } = pageData;

  // Local UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultTipo, setModalDefaultTipo] = useState<"receita" | "despesa" | "pagamento" | "recebimento">("receita");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Handlers
  const updateQueryParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        next.delete(key);
        continue;
      }
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const handleMainTabChange = (value: string) => updateQueryParams({ tab: value });
  const handlePeriodChange = (value: string) => updateQueryParams({ period: value });

  const handleOpenTransactionModal = (defaultTipo: "receita" | "despesa" | "pagamento" | "recebimento" = "receita") => {
    setModalDefaultTipo(defaultTipo);
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setModalDefaultTipo((transaction.tipo as any) ?? "receita");
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<Transaction, "id" | "created_at" | "updated_at">) => {
    if (editingTransaction) {
      await mutations.update({ id: editingTransaction.id, transaction: data });
    } else {
      await mutations.create(data);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await mutations.delete(deleteId);
    setDeleteId(null);
  };

  const handleExport = async () => {
    if (transactions.length === 0) return;
    setIsExporting(true);
    try {
      const { exportFinancialReport } = await import("@/lib/export/excelExport");
      await exportFinancialReport({
        totalRevenue: stats.totalRevenue,
        pendingPayments: stats.pendingPayments,
        paidCount: stats.paidCount,
        totalCount: stats.totalCount,
        averageTicket: stats.averageTicket,
        transactions: transactions.map(t => ({
          id: t.id,
          tipo: t.tipo,
          descricao: t.descricao || "",
          valor: Number(t.valor),
          status: t.status,
          data_vencimento: t.created_at,
          data_pagamento: t.status === "concluido" || t.status === "pago" ? t.updated_at : undefined,
        })),
      });
      toast({ title: "Exportação concluída", description: "O relatório financeiro foi gerado com sucesso." });
    } catch {
      toast({ title: "Erro na exportação", description: "Não foi possível gerar o relatório.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    state: {
      period,
      activeTab,
      collectionsSubview,
      billingSubview,
      documentsSubview,
      performanceSubview,
      shouldAutoOpenReceipt,
      shouldAutoOpenNfse,
      isModalOpen,
      editingTransaction,
      modalDefaultTipo,
      deleteId,
      isExporting,
      isLoading: isLoadingCommandCenter || isSubmitting
    },
    data: {
      transactions,
      stats,
      commandCenter
    },
    actions: {
      setIsModalOpen,
      setDeleteId,
      updateQueryParams,
      handleMainTabChange,
      handlePeriodChange,
      handleOpenTransactionModal,
      handleEditTransaction,
      handleMarkAsPaid: mutations.markAsPaid,
      handleSubmit,
      handleDelete,
      handleExport,
      clearActionParams: (...keys: string[]) => {
        const updates = Object.fromEntries(keys.map((key) => [key, null]));
        updateQueryParams(updates);
      }
    }
  };
}
