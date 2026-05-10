import {
  BarChart3,
  Download,
  FileText,
  HandCoins,
  LayoutDashboard,
  LineChart,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import { lazy, Suspense } from "react";
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
import { formatCurrency } from "@/lib/utils";
import { AnalyticsFiltersProvider } from "@/contexts/AnalyticsFiltersContext";

// Hook and UI Utils
import { useFinancialCommandCenterLogic } from "@/hooks/useFinancialCommandCenterLogic";
import { SectionSkeleton, PageShellFallback } from "./components/FinancialUIUtils";
import { BillingOperationsTable } from "./components/BillingOperationsTable";

// Lazy Components
const PackagesManager = lazy(() =>
  import("@/components/financial/PackagesManager").then((m) => ({ default: m.PackagesManager })),
);
const FluxoCaixaContent = lazy(() =>
  import("./FluxoCaixaPage").then((module) => ({ default: module.FluxoCaixaContent })),
);
const ContasFinanceirasContent = lazy(() =>
  import("./ContasFinanceirasPage").then((module) => ({ default: module.ContasFinanceirasContent })),
);
const RecibosContent = lazy(() =>
  import("./RecibosPage").then((module) => ({ default: module.RecibosContent })),
);
const NFSeContent = lazy(() =>
  import("@/components/financial/NFSeContent").then((module) => ({ default: module.NFSeContent })),
);
const FinancialDRE = lazy(() =>
  import("@/components/financial/dre/FinancialDRE").then((m) => ({ default: m.FinancialDRE })),
);
const FinancialAnalytics = lazy(() =>
  import("@/components/analytics/FinancialAnalytics").then((m) => ({ default: m.FinancialAnalytics })),
);
const DemonstrativoMensalContent = lazy(() =>
  import("./components/DemonstrativoMensalContent").then((module) => ({ default: module.DemonstrativoMensalContent })),
);
const CommissionsDashboard = lazy(() =>
  import("@/components/financial/CommissionsDashboard").then((m) => ({ default: m.CommissionsDashboard })),
);
const NfseBatchEmitter = lazy(() =>
  import("@/components/financial/NfseBatchEmitter").then((m) => ({ default: m.NfseBatchEmitter })),
);

const FinancialCommandCenterPage = () => {
  const { state, data, actions } = useFinancialCommandCenterLogic();
  const { transactions, stats, commandCenter } = data;

  return (
    <MainLayout>
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8">
        {/* Header Section */}
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
                <Select value={state.period} onValueChange={actions.handlePeriodChange}>
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
                  onClick={actions.handleExport}
                  variant="outline"
                  className="h-10 rounded-2xl border-white/80 bg-white/70 px-4 font-bold shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60"
                  disabled={transactions.length === 0 || state.isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
                <Button
                  onClick={() => actions.handleOpenTransactionModal("receita")}
                  className="h-10 rounded-2xl px-5 font-bold shadow-sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova transação
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={() => actions.updateQueryParams({ tab: "collections", collections: "receivables" })}
              >
                <HandCoins className="mr-2 h-4 w-4" />
                Cobrar paciente
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={() => actions.updateQueryParams({ tab: "documents", documents: "receipts", receiptAction: "new" })}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Emitir recibo
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={() => actions.updateQueryParams({ tab: "documents", documents: "nfse", nfseAction: "new" })}
              >
                <FileText className="mr-2 h-4 w-4" />
                Emitir NFS-e
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-2xl border-white/80 bg-white/70 font-bold dark:border-slate-800/80 dark:bg-slate-950/50"
                onClick={() => actions.handleOpenTransactionModal("despesa")}
              >
                <Wallet className="mr-2 h-4 w-4" />
                Registrar despesa
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs value={state.activeTab} onValueChange={actions.handleMainTabChange} className="space-y-6">
          <div className="sticky top-14 z-20 rounded-[28px] border border-white/80 bg-white/85 p-2 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
              <TabsTrigger value="summary" className="rounded-2xl px-4 py-2.5 font-bold"><LayoutDashboard className="mr-2 h-4 w-4" />Resumo</TabsTrigger>
              <TabsTrigger value="collections" className="rounded-2xl px-4 py-2.5 font-bold"><HandCoins className="mr-2 h-4 w-4" />Cobrança</TabsTrigger>
              <TabsTrigger value="cashflow" className="rounded-2xl px-4 py-2.5 font-bold"><LineChart className="mr-2 h-4 w-4" />Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-2xl px-4 py-2.5 font-bold"><Wallet className="mr-2 h-4 w-4" />Faturamento</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-2xl px-4 py-2.5 font-bold"><FileText className="mr-2 h-4 w-4" />Documentos</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-2xl px-4 py-2.5 font-bold"><BarChart3 className="mr-2 h-4 w-4" />Performance</TabsTrigger>
              <TabsTrigger value="commissions" className="rounded-2xl px-4 py-2.5 font-bold"><Receipt className="mr-2 h-4 w-4" />Comissões</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="summary" className="space-y-6">
            {!commandCenter && state.isLoading ? (
              <SectionSkeleton />
            ) : commandCenter ? (
              <FinancialCommandCenterSummary data={commandCenter} onNewTransaction={() => actions.handleOpenTransactionModal("receita")} />
            ) : (
              <EmptyState
                icon={LayoutDashboard}
                title="Sem dados para o resumo"
                description="Assim que o financeiro começar a receber movimentações, o command center será preenchido."
                action={{ label: "Nova Transação", onClick: () => actions.handleOpenTransactionModal("receita") }}
              />
            )}
          </TabsContent>

          <TabsContent value="collections" className="space-y-6">
            <Tabs value={state.collectionsSubview} onValueChange={(v) => actions.updateQueryParams({ tab: "collections", collections: v })} className="space-y-5">
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="receivables" className="rounded-2xl px-4 py-2 font-bold">Recebíveis</TabsTrigger>
                <TabsTrigger value="packages" className="rounded-2xl px-4 py-2 font-bold">Pacotes</TabsTrigger>
              </TabsList>
              <TabsContent value="receivables" className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Vencidas" value={commandCenter?.collections.overdueCount ?? 0} />
                  <MetricCard title="Vencem hoje" value={commandCenter?.collections.dueTodayCount ?? 0} />
                  <MetricCard title="Saldo em aberto" value={formatCurrency(commandCenter?.summary.pendingReceivables ?? 0)} />
                </div>
                <Suspense fallback={<PageShellFallback />}>
                  <ContasFinanceirasContent initialTab="receber" title="Central de cobrança" description="Recebíveis, inadimplência e vencimentos priorizados no mesmo fluxo." actionLabel="Nova cobrança" />
                </Suspense>
              </TabsContent>
              <TabsContent value="packages">
                <Suspense fallback={<PageShellFallback />}><PackagesManager /></Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="cashflow" className="space-y-6">
            <Suspense fallback={<PageShellFallback />}><FluxoCaixaContent /></Suspense>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <Tabs value={state.billingSubview} onValueChange={(v) => actions.updateQueryParams({ tab: "billing", billing: v })} className="space-y-5">
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="operations" className="rounded-2xl px-4 py-2 font-bold">Operação</TabsTrigger>
                <TabsTrigger value="payables" className="rounded-2xl px-4 py-2 font-bold">Contas a pagar</TabsTrigger>
              </TabsList>
              <TabsContent value="operations" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Receita filtrada" value={formatCurrency(stats.totalRevenue)} />
                  <MetricCard title="Pendências filtradas" value={formatCurrency(stats.pendingPayments)} />
                  <MetricCard title="Ticket filtrado" value={formatCurrency(stats.averageTicket)} />
                </div>
                <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                    <div>
                      <CardTitle className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Operação diária de lançamentos</CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Tabela de transações filtrada pelo período atual.</p>
                    </div>
                    <Button onClick={() => actions.handleOpenTransactionModal("receita")} className="rounded-2xl font-bold"><Plus className="mr-2 h-4 w-4" />Novo lançamento</Button>
                  </CardHeader>
                  <CardContent>
                    <BillingOperationsTable
                      transactions={transactions}
                      onNewTransaction={() => actions.handleOpenTransactionModal("receita")}
                      onEditTransaction={actions.handleEditTransaction}
                      onMarkAsPaid={actions.handleMarkAsPaid}
                      onDeleteTransaction={actions.setDeleteId}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="payables">
                <Suspense fallback={<PageShellFallback />}>
                  <ContasFinanceirasContent initialTab="pagar" lockType title="Contas a pagar" description="Saídas futuras, vencimentos críticos e compromissos financeiros concentrados no faturamento." actionLabel="Nova conta a pagar" />
                </Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard title="Recibos" value={commandCenter?.documents.receiptsInPeriod ?? 0} />
              <MetricCard title="NFS-e pendentes" value={commandCenter?.documents.pendingNfse ?? 0} />
              <MetricCard title="NFS-e autorizadas" value={commandCenter?.documents.authorizedNfse ?? 0} />
            </div>
            <Tabs value={state.documentsSubview} onValueChange={(v) => actions.updateQueryParams({ tab: "documents", documents: v })} className="space-y-5">
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="receipts" className="rounded-2xl px-4 py-2 font-bold">Recibos</TabsTrigger>
                <TabsTrigger value="nfse" className="rounded-2xl px-4 py-2 font-bold">NFS-e</TabsTrigger>
              </TabsList>
              <TabsContent value="receipts">
                <Suspense fallback={<PageShellFallback />}><RecibosContent autoOpenCreate={state.shouldAutoOpenReceipt} onAutoOpenHandled={() => actions.clearActionParams("receiptAction")} /></Suspense>
              </TabsContent>
              <TabsContent value="nfse" className="space-y-4">
                <Suspense fallback={null}><NfseBatchEmitter /></Suspense>
                <Suspense fallback={<PageShellFallback />}><NFSeContent autoOpenCreate={state.shouldAutoOpenNfse} onAutoOpenHandled={() => actions.clearActionParams("nfseAction")} /></Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Tabs value={state.performanceSubview} onValueChange={(v) => actions.updateQueryParams({ tab: "performance", performance: v })} className="space-y-5">
              <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] bg-white/80 p-2 dark:bg-slate-950/70">
                <TabsTrigger value="analytics" className="rounded-2xl px-4 py-2 font-bold">Painel</TabsTrigger>
                <TabsTrigger value="raiox" className="rounded-2xl px-4 py-2 font-bold">Raio-X Mensal</TabsTrigger>
                <TabsTrigger value="dre" className="rounded-2xl px-4 py-2 font-bold">DRE</TabsTrigger>
              </TabsList>
              <TabsContent value="analytics">
                <Suspense fallback={<PageShellFallback />}><AnalyticsFiltersProvider><FinancialAnalytics /></AnalyticsFiltersProvider></Suspense>
              </TabsContent>
              <TabsContent value="raiox">
                <Suspense fallback={<PageShellFallback />}><DemonstrativoMensalContent /></Suspense>
              </TabsContent>
              <TabsContent value="dre">
                <Suspense fallback={<PageShellFallback />}><FinancialDRE /></Suspense>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="commissions">
            <Suspense fallback={<PageShellFallback />}><CommissionsDashboard /></Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <TransactionModal
        open={state.isModalOpen}
        onOpenChange={actions.setIsModalOpen}
        onSubmit={actions.handleSubmit}
        transaction={state.editingTransaction ?? undefined}
        isLoading={state.isLoading}
        defaultTipo={state.modalDefaultTipo}
      />

      <AlertDialog open={!!state.deleteId} onOpenChange={(open) => !open && actions.setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação remove o lançamento atual da operação financeira.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={actions.handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="rounded-[28px] border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70">
      <CardContent className="p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{title}</p>
        <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white md:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

export default FinancialCommandCenterPage;
