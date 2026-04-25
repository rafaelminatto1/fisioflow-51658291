import {
  BarChart3,
  CheckCircle2,
  Download,
  FileText,
  HandCoins,
  LayoutDashboard,
  LineChart,
  PenSquare,
  Plus,
  Receipt,
  Trash2,
  Wallet,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TransactionModal } from "@/components/financial";
import { FinancialCommandCenterSummary } from "@/components/financial/command-center/FinancialCommandCenterSummary";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Transaction } from "@/hooks/useFinancial";
import { useToast } from "@/hooks/use-toast";
import { type PeriodType, useFinancialPageData } from "@/hooks/useFinancialPage";
import { useFinancialCommandCenter } from "@/hooks/useFinancialCommandCenter";
import { cn, formatCurrency } from "@/lib/utils";

const PackagesManager = lazy(() =>
  import("@/components/financial/PackagesManager").then((m) => ({
    default: m.PackagesManager,
  })),
);
const FluxoCaixaContent = lazy(() =>
  import("./FluxoCaixaPage").then((module) => ({
    default: module.FluxoCaixaContent,
  })),
);
const ContasFinanceirasContent = lazy(() =>
  import("./ContasFinanceirasPage").then((module) => ({
    default: module.ContasFinanceirasContent,
  })),
);
const RecibosContent = lazy(() =>
  import("./RecibosPage").then((module) => ({
    default: module.RecibosContent,
  })),
);
const NFSeContent = lazy(() =>
  import("@/components/financial/NFSeContent").then((module) => ({
    default: module.NFSeContent,
  })),
);
const FinancialDRE = lazy(() =>
  import("@/components/financial/dre/FinancialDRE").then((m) => ({
    default: m.FinancialDRE,
  })),
);
const FinancialAnalytics = lazy(() =>
  import("@/components/analytics/FinancialAnalytics").then((m) => ({
    default: m.FinancialAnalytics,
  })),
);
const CommissionsDashboard = lazy(() =>
  import("@/components/financial/CommissionsDashboard").then((m) => ({
    default: m.CommissionsDashboard,
  })),
);

const MAIN_TABS = [
  "summary",
  "collections",
  "cashflow",
  "billing",
  "documents",
  "performance",
  "commissions",
] as const;
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

function parseCollectionsSubview(value: string | null): CollectionsSubview {
  if (value && COLLECTIONS_SUBVIEWS.includes(value as CollectionsSubview)) {
    return value as CollectionsSubview;
  }

  return "receivables";
}

function parseBillingSubview(value: string | null): BillingSubview {
  if (value && BILLING_SUBVIEWS.includes(value as BillingSubview)) {
    return value as BillingSubview;
  }

  return "operations";
}

function parseDocumentsSubview(value: string | null): DocumentsSubview {
  if (value && DOCUMENTS_SUBVIEWS.includes(value as DocumentsSubview)) {
    return value as DocumentsSubview;
  }

  return "receipts";
}

function parsePerformanceSubview(value: string | null): PerformanceSubview {
  if (value && PERFORMANCE_SUBVIEWS.includes(value as PerformanceSubview)) {
    return value as PerformanceSubview;
  }

  return "analytics";
}

function renderStatusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "concluido" || normalized === "pago") {
    return (
      <Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        Concluído
      </Badge>
    );
  }

  if (normalized === "cancelado") {
    return (
      <Badge className="border-0 bg-slate-500/10 text-slate-700 dark:text-slate-300">
        Cancelado
      </Badge>
    );
  }

  return (
    <Badge className="border-0 bg-amber-500/10 text-amber-700 dark:text-amber-300">Pendente</Badge>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="h-28 rounded-[28px] animate-pulse border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70"
          />
        ))}
      </div>
      <Card className="h-[420px] rounded-[32px] animate-pulse border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70" />
    </div>
  );
}

function PageShellFallback() {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
      <CardContent className="p-6">
        <div className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
      </CardContent>
    </Card>
  );
}

const FinancialCommandCenterPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = parsePeriod(searchParams.get("period"));
  const activeTab = parseMainTab(searchParams.get("tab"));
  const collectionsSubview = parseCollectionsSubview(searchParams.get("collections"));
  const billingSubview = parseBillingSubview(searchParams.get("billing"));
  const documentsSubview = parseDocumentsSubview(searchParams.get("documents"));
  const performanceSubview = parsePerformanceSubview(searchParams.get("performance"));
  const shouldAutoOpenReceipt = searchParams.get("receiptAction") === "new";
  const shouldAutoOpenNfse = searchParams.get("nfseAction") === "new";

  const { data: pageData, mutations, isLoading: isSubmitting } = useFinancialPageData(period);
  const { data: commandCenter, isLoading: isLoadingCommandCenter } =
    useFinancialCommandCenter(period);

  const { transactions, stats } = pageData;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [modalDefaultTipo, setModalDefaultTipo] = useState<
    "receita" | "despesa" | "pagamento" | "recebimento"
  >("receita");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { toast } = useToast();

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

  const handleMainTabChange = (value: string) => {
    updateQueryParams({ tab: value });
  };

  const handlePeriodChange = (value: string) => {
    updateQueryParams({ period: value });
  };

  const handleOpenTransactionModal = (
    defaultTipo: "receita" | "despesa" | "pagamento" | "recebimento" = "receita",
  ) => {
    setModalDefaultTipo(defaultTipo);
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleNewTransaction = () => {
    handleOpenTransactionModal("receita");
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setModalDefaultTipo(
      (transaction.tipo as "receita" | "despesa" | "pagamento" | "recebimento") ?? "receita",
    );
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleRegisterExpense = () => {
    handleOpenTransactionModal("despesa");
  };

  const handleReceiptQuickAction = () => {
    updateQueryParams({
      tab: "documents",
      documents: "receipts",
      receiptAction: "new",
    });
  };

  const handleNfseQuickAction = () => {
    updateQueryParams({
      tab: "documents",
      documents: "nfse",
      nfseAction: "new",
    });
  };

  const clearActionParams = (...keys: string[]) => {
    const updates = Object.fromEntries(keys.map((key) => [key, null]));
    updateQueryParams(updates);
  };

  const handleSubmit = async (data: Omit<Transaction, "id" | "created_at" | "updated_at">) => {
    try {
      if (editingTransaction) {
        await mutations.update({
          id: editingTransaction.id,
          transaction: data,
        });
      } else {
        await mutations.create(data);
      }
      setIsModalOpen(false);
    } catch {
      // mutation handles feedback
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await mutations.delete(deleteId);
      setDeleteId(null);
    } catch {
      // mutation handles feedback
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await mutations.markAsPaid(id);
    } catch {
      // mutation handles feedback
    }
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
        transactions: transactions.map((transaction) => ({
          id: transaction.id,
          tipo: transaction.tipo,
          descricao: transaction.descricao || "",
          valor: Number(transaction.valor),
          status: transaction.status,
          data_vencimento: transaction.created_at,
          data_pagamento:
            transaction.status === "concluido" || transaction.status === "pago"
              ? transaction.updated_at
              : undefined,
        })),
      });
      toast({
        title: "Exportação concluída",
        description: "O relatório financeiro foi gerado com sucesso.",
      });
    } catch {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        <Card className="rounded-[30px] border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(246,249,255,0.95),rgba(241,251,246,0.9))] shadow-[0_28px_80px_-60px_rgba(37,99,235,0.42)] dark:border-primary/20 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(17,24,39,0.9),rgba(6,78,59,0.18))]">
          <CardContent className="space-y-4 p-5 md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <Badge className="w-fit rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 shadow-sm dark:bg-slate-900/70 dark:text-slate-200">
                  Command Center Financeiro
                </Badge>
                <div className="space-y-1">
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white md:text-3xl">
                    Gestão Financeira
                  </h1>
                  <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                    Visão unificada de caixa, cobrança, documentos e performance conectada a
                    pacientes, CRM, marketing e agenda.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="h-10 w-[180px] rounded-2xl border-white/80 bg-white/70 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="daily">Hoje</SelectItem>
                    <SelectItem value="weekly">Últimos 7 dias</SelectItem>
                    <SelectItem value="monthly">Últimos 30 dias</SelectItem>
                    <SelectItem value="all">Últimos 180 dias</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="h-10 rounded-2xl border-white/80 bg-white/70 px-4 font-bold shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60"
                  disabled={transactions.length === 0 || isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
                <Button
                  onClick={handleNewTransaction}
                  className="h-10 rounded-2xl px-5 font-bold shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova transação
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={() =>
                  updateQueryParams({
                    tab: "collections",
                    collections: "receivables",
                  })
                }
              >
                <HandCoins className="mr-2 h-4 w-4" />
                Cobrar paciente
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={handleReceiptQuickAction}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Emitir recibo
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={handleNfseQuickAction}
              >
                <FileText className="mr-2 h-4 w-4" />
                Emitir NFS-e
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={handleRegisterExpense}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Registrar despesa
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleMainTabChange} className="space-y-6">
          <div className="sticky top-14 z-20 rounded-[28px] border border-white/80 bg-white/85 p-2 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="summary" className="rounded-2xl px-4 py-2.5 font-bold">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Resumo
              </TabsTrigger>
              <TabsTrigger value="collections" className="rounded-2xl px-4 py-2.5 font-bold">
                <HandCoins className="mr-2 h-4 w-4" />
                Cobrança
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="rounded-2xl px-4 py-2.5 font-bold">
                <LineChart className="mr-2 h-4 w-4" />
                Fluxo de Caixa
              </TabsTrigger>
              <TabsTrigger value="billing" className="rounded-2xl px-4 py-2.5 font-bold">
                <Wallet className="mr-2 h-4 w-4" />
                Faturamento
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-2xl px-4 py-2.5 font-bold">
                <FileText className="mr-2 h-4 w-4" />
                Documentos
              </TabsTrigger>
              <TabsTrigger value="performance" className="rounded-2xl px-4 py-2.5 font-bold">
                <BarChart3 className="mr-2 h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="commissions" className="rounded-2xl px-4 py-2.5 font-bold">
                <Receipt className="mr-2 h-4 w-4" />
                Comissões
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="space-y-6">
            {!commandCenter && isLoadingCommandCenter ? (
              <SectionSkeleton />
            ) : commandCenter ? (
              <FinancialCommandCenterSummary
                data={commandCenter}
                onNewTransaction={handleNewTransaction}
              />
            ) : (
              <EmptyState
                icon={LayoutDashboard}
                title="Sem dados para o resumo"
                description="Assim que o financeiro começar a receber movimentações, o command center será preenchido."
                action={{
                  label: "Nova Transação",
                  onClick: handleNewTransaction,
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            <Tabs
              value={collectionsSubview}
              onValueChange={(value) =>
                updateQueryParams({ tab: "collections", collections: value })
              }
              className="space-y-5"
            >
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="receivables" className="rounded-2xl px-4 py-2 font-bold">
                  Recebíveis
                </TabsTrigger>
                <TabsTrigger value="packages" className="rounded-2xl px-4 py-2 font-bold">
                  Pacotes
                </TabsTrigger>
              </TabsList>

              <TabsContent value="receivables" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Vencidas
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                        {commandCenter?.collections.overdueCount ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Vencem hoje
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                        {commandCenter?.collections.dueTodayCount ?? 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Saldo em aberto
                      </p>
                      <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                        {formatCurrency(commandCenter?.summary.pendingReceivables ?? 0)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Suspense fallback={<PageShellFallback />}>
                  <ContasFinanceirasContent
                    initialTab="receber"
                    title="Central de cobrança"
                    description="Recebíveis, inadimplência e vencimentos priorizados no mesmo fluxo."
                    actionLabel="Nova cobrança"
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="packages">
                <Suspense fallback={<PageShellFallback />}>
                  <PackagesManager />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <Suspense fallback={<PageShellFallback />}>
              <FluxoCaixaContent />
            </Suspense>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Tabs
              value={billingSubview}
              onValueChange={(value) => updateQueryParams({ tab: "billing", billing: value })}
              className="space-y-5"
            >
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="operations" className="rounded-2xl px-4 py-2 font-bold">
                  Operação
                </TabsTrigger>
                <TabsTrigger value="payables" className="rounded-2xl px-4 py-2 font-bold">
                  Contas a pagar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="operations" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Receita filtrada
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Pendências filtradas
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {formatCurrency(stats.pendingPayments)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <CardContent className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Ticket filtrado
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {formatCurrency(stats.averageTicket)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight text-slate-950 dark:text-white">
                        Operação diária de lançamentos
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tabela de transações filtrada pelo período atual.
                      </p>
                    </div>
                    <Button onClick={handleNewTransaction} className="rounded-2xl font-bold">
                      <Plus className="mr-2 h-4 w-4" />
                      Novo lançamento
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <EmptyState
                        icon={Wallet}
                        title="Sem transações neste período"
                        description="Use o faturamento para registrar receitas, despesas e acompanhar a operação diária."
                        action={{
                          label: "Nova Transação",
                          onClick: handleNewTransaction,
                        }}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:border-slate-800">
                              <th className="px-4 py-4">Data</th>
                              <th className="px-4 py-4">Descrição</th>
                              <th className="px-4 py-4">Tipo</th>
                              <th className="px-4 py-4">Status</th>
                              <th className="px-4 py-4 text-right">Valor</th>
                              <th className="px-4 py-4 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                            {transactions.map((transaction) => (
                              <tr
                                key={transaction.id}
                                className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                              >
                                <td className="px-4 py-4 text-slate-500 dark:text-slate-400">
                                  {transaction.created_at
                                    ? new Date(transaction.created_at).toLocaleDateString("pt-BR")
                                    : "-"}
                                </td>
                                <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">
                                  {transaction.descricao || "Sem descrição"}
                                </td>
                                <td className="px-4 py-4">
                                  <Badge
                                    className={cn(
                                      "border-0",
                                      transaction.tipo === "receita"
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                                    )}
                                  >
                                    {transaction.tipo}
                                  </Badge>
                                </td>
                                <td className="px-4 py-4">
                                  {renderStatusBadge(transaction.status)}
                                </td>
                                <td className="px-4 py-4 text-right font-black text-slate-950 dark:text-white">
                                  {formatCurrency(Number(transaction.valor))}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-xl"
                                      onClick={() => handleEditTransaction(transaction)}
                                    >
                                      <PenSquare className="h-4 w-4" />
                                    </Button>
                                    {transaction.status !== "concluido" &&
                                      transaction.status !== "pago" && (
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-9 w-9 rounded-xl"
                                          onClick={() => handleMarkAsPaid(transaction.id)}
                                        >
                                          <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-xl text-rose-600"
                                      onClick={() => setDeleteId(transaction.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payables">
                <Suspense fallback={<PageShellFallback />}>
                  <ContasFinanceirasContent
                    initialTab="pagar"
                    lockType
                    title="Contas a pagar"
                    description="Saídas futuras, vencimentos críticos e compromissos financeiros concentrados no faturamento."
                    actionLabel="Nova conta a pagar"
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                <CardContent className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Recibos
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {commandCenter?.documents.receiptsInPeriod ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                <CardContent className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    NFS-e pendentes
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {commandCenter?.documents.pendingNfse ?? 0}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
                <CardContent className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    NFS-e autorizadas
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {commandCenter?.documents.authorizedNfse ?? 0}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs
              value={documentsSubview}
              onValueChange={(value) => updateQueryParams({ tab: "documents", documents: value })}
              className="space-y-5"
            >
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="receipts" className="rounded-2xl px-4 py-2 font-bold">
                  Recibos
                </TabsTrigger>
                <TabsTrigger value="nfse" className="rounded-2xl px-4 py-2 font-bold">
                  NFS-e
                </TabsTrigger>
              </TabsList>

              <TabsContent value="receipts">
                <Suspense fallback={<PageShellFallback />}>
                  <RecibosContent
                    autoOpenCreate={shouldAutoOpenReceipt}
                    onAutoOpenHandled={() => clearActionParams("receiptAction")}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="nfse">
                <Suspense fallback={<PageShellFallback />}>
                  <NFSeContent
                    autoOpenCreate={shouldAutoOpenNfse}
                    onAutoOpenHandled={() => clearActionParams("nfseAction")}
                  />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Tabs
              value={performanceSubview}
              onValueChange={(value) =>
                updateQueryParams({ tab: "performance", performance: value })
              }
              className="space-y-5"
            >
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="analytics" className="rounded-2xl px-4 py-2 font-bold">
                  Painel
                </TabsTrigger>
                <TabsTrigger value="dre" className="rounded-2xl px-4 py-2 font-bold">
                  DRE
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                <Suspense fallback={<PageShellFallback />}>
                  <FinancialAnalytics />
                </Suspense>
              </TabsContent>

              <TabsContent value="dre">
                <Suspense fallback={<PageShellFallback />}>
                  <FinancialDRE />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="commissions">
            <Suspense fallback={<PageShellFallback />}>
              <CommissionsDashboard />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <TransactionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleSubmit}
        transaction={editingTransaction ?? undefined}
        isLoading={isSubmitting}
        defaultTipo={modalDefaultTipo}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o lançamento atual da operação financeira.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default FinancialCommandCenterPage;
