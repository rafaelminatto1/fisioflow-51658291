import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

import { useContasFinanceirasLogic } from "@/hooks/useContasFinanceirasLogic";
import { ContasResumoCards } from "./components/ContasResumoCards";
import { ContasTable } from "./components/ContasTable";
import { ContaDialog } from "./components/ContaDialog";

interface ContasFinanceirasContentProps {
  initialTab?: "receber" | "pagar";
  lockType?: boolean;
  title?: string;
  description?: string;
  actionLabel?: string;
}

export function ContasFinanceirasContent({
  initialTab = "receber",
  lockType = false,
  title = "Contas a Pagar e Receber",
  description = "Gestão detalhada de fluxos futuros e compromissos",
  actionLabel = "Nova Conta",
}: ContasFinanceirasContentProps = {}) {
  const {
    tab,
    setTab,
    statusFilter,
    setStatusFilter,
    isDialogOpen,
    setIsDialogOpen,
    editingConta,
    formData,
    setFormData,
    contas,
    isLoading,
    resumo,
    createMutation,
    updateMutation,
    handleOpenDialog,
    handleSubmit,
    handleQuitar,
  } = useContasFinanceirasLogic({ initialTab, lockType });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      </div>

      <ContasResumoCards resumo={resumo} />

      <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "receber" | "pagar")}>
            <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800/50">
              {lockType ? (
                <div className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {tab === "receber" ? "Entradas" : "Saídas"}
                </div>
              ) : (
                <TabsList className="bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  <TabsTrigger
                    value="receber"
                    className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider gap-2"
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    Entradas
                  </TabsTrigger>
                  <TabsTrigger
                    value="pagar"
                    className="rounded-lg px-4 font-bold text-xs uppercase tracking-wider gap-2"
                  >
                    <ArrowDownCircle className="h-3.5 w-3.5" />
                    Saídas
                  </TabsTrigger>
                </TabsList>
              )}
              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[150px] rounded-xl font-bold text-xs h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <TabsContent value={tab} className="m-0">
              {isLoading ? (
                <div className="text-center py-20 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                  Carregando dados...
                </div>
              ) : contas.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                  Nenhum lançamento encontrado
                </div>
              ) : (
                <ContasTable contas={contas} tab={tab} handleQuitar={handleQuitar} />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ContaDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingConta={editingConta}
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

export default function ContasFinanceirasPage() {
  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <ContasFinanceirasContent />
      </div>
    </MainLayout>
  );
}
