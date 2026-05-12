import {
  BarChart3,
  Brain,
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
import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
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
const ClinicalValueDashboard = lazy(() =>
  import("@/components/analytics/ClinicalValueDashboard").then((m) => ({ default: m.ClinicalValueDashboard })),
);
const LTVMaximizerWidget = lazy(() =>
  import("@/components/marketing/LTVMaximizerWidget").then((m) => ({ default: m.LTVMaximizerWidget })),
);
const TeamPerformanceDashboard = lazy(() =>
  import("@/components/analytics/TeamPerformanceDashboard").then((m) => ({ default: m.TeamPerformanceDashboard })),
);
const NfseBatchEmitter = lazy(() =>
  import("@/components/financial/NfseBatchEmitter").then((m) => ({ default: m.NfseBatchEmitter })),
);

const FinancialCommandCenterPage = () => {
  const { state, data, actions } = useFinancialCommandCenterLogic();
  const { transactions, stats, commandCenter } = data;

  return (
    <PageLayout>
      <PageHeader
        title="Gestão Financeira"
        description="Visão unificada de caixa, cobrança, documentos e performance conectada a pacientes, CRM, marketing e agenda."
        icon={LayoutDashboard}
        breadcrumb={[{ label: "Financeiro", href: "/financeiro" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={state.period} onValueChange={actions.handlePeriodChange}>
              <SelectTrigger className="h-10 w-[160px] rounded-2xl border-white/80 bg-white/70 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/60">
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
              className="h-10 rounded-2xl px-5 font-bold shadow-sm bg-brand-blue hover:bg-brand-blue/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova transação
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            className="h-9 rounded-full border-brand-blue/20 bg-brand-blue/5 text-brand-blue font-bold hover:bg-brand-blue/10"
            onClick={() => actions.updateQueryParams({ tab: "collections", collections: "receivables" })}
          >
            <HandCoins className="mr-2 h-4 w-4" />
            Cobrar paciente
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-full border-brand-blue/20 bg-brand-blue/5 text-brand-blue font-bold hover:bg-brand-blue/10"
            onClick={() => actions.updateQueryParams({ tab: "documents", documents: "receipts", receiptAction: "new" })}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Emitir recibo
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-full border-brand-blue/20 bg-brand-blue/5 text-brand-blue font-bold hover:bg-brand-blue/10"
            onClick={() => actions.updateQueryParams({ tab: "documents", documents: "nfse", nfseAction: "new" })}
          >
            <FileText className="mr-2 h-4 w-4" />
            Emitir NFS-e
          </Button>
          <Button
            variant="outline"
            className="h-9 rounded-full border-brand-blue/20 bg-brand-blue/5 text-brand-blue font-bold hover:bg-brand-blue/10"
            onClick={() => actions.handleOpenTransactionModal("despesa")}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Registrar despesa
          </Button>
        </div>
      </PageHeader>

      <PageContainer>

        <Tabs value={state.activeTab} onValueChange={actions.handleMainTabChange} className="space-y-6">
          <div className="sticky top-14 z-20 rounded-[28px] border border-white/80 bg-white/85 p-1.5 shadow-premium backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value="summary" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><LayoutDashboard className="mr-2 h-4 w-4" />Resumo</TabsTrigger>
              <TabsTrigger value="collections" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><HandCoins className="mr-2 h-4 w-4" />Cobrança</TabsTrigger>
              <TabsTrigger value="cashflow" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><LineChart className="mr-2 h-4 w-4" />Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><Wallet className="mr-2 h-4 w-4" />Faturamento</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><FileText className="mr-2 h-4 w-4" />Documentos</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><BarChart3 className="mr-2 h-4 w-4" />Performance</TabsTrigger>
              <TabsTrigger value="clinical-bi" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><Brain className="mr-2 h-4 w-4" />Inteligência Clínica</TabsTrigger>
              <TabsTrigger value="commissions" className="rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-brand-blue data-[state=active]:text-white"><Receipt className="mr-2 h-4 w-4" />Comissões</TabsTrigger>
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
                <TabsTrigger value="team" className="rounded-2xl px-4 py-2 font-bold">Equipe</TabsTrigger>
                <TabsTrigger value="raiox" className="rounded-2xl px-4 py-2 font-bold">Raio-X Mensal</TabsTrigger>
                <TabsTrigger value="dre" className="rounded-2xl px-4 py-2 font-bold">DRE</TabsTrigger>
              </TabsList>
              <TabsContent value="analytics">
                <Suspense fallback={<PageShellFallback />}>
                  <AnalyticsFiltersProvider>
                    <div className="space-y-8">
                      <LTVMaximizerWidget />
                      <FinancialAnalytics />
                    </div>
                  </AnalyticsFiltersProvider>
                </Suspense>
              </TabsContent>
              <TabsContent value="team">
                <Suspense fallback={<PageShellFallback />}><TeamPerformanceDashboard /></Suspense>
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

          <TabsContent value="clinical-bi">
            <Suspense fallback={<PageShellFallback />}>
              <div className="space-y-6">
                <div className="rounded-[2rem] bg-gradient-to-br from-brand-blue to-indigo-600 p-8 text-white shadow-xl">
                  <h2 className="text-2xl font-black mb-2">Clinical Business Intelligence</h2>
                  <p className="text-blue-100 max-w-2xl text-sm">
                    Análise estratégica correlacionando desfechos clínicos (IA Studio & RTM) com performance financeira (LTV). 
                    Identifique os protocolos mais rentáveis e pacientes com risco de abandono.
                  </p>
                </div>
                <ClinicalValueDashboard />
              </div>
            </Suspense>
          </TabsContent>
        </Tabs>
      </PageContainer>

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
            <AlertDialogAction onClick={actions.handleDelete} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
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
