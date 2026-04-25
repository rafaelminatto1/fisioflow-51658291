import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  Clock,
  CheckCircle,
} from "lucide-react";
import {
  useContasFinanceiras,
  useCreateContaFinanceira,
  useUpdateContaFinanceira,
  useResumoFinanceiro,
  ContaFinanceira,
} from "@/hooks/useContasFinanceiras";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MainLayout } from "@/components/layout/MainLayout";

const CATEGORIAS = [
  "Consulta",
  "Pacote",
  "Aluguel",
  "Salário",
  "Material",
  "Equipamento",
  "Marketing",
  "Outros",
];

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
  const [tab, setTab] = useState<"receber" | "pagar">(initialTab);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaFinanceira | null>(null);

  const [formData, setFormData] = useState({
    tipo: "receber" as "receber" | "pagar",
    descricao: "",
    valor: "",
    data_vencimento: "",
    categoria: "",
    forma_pagamento: "",
    observacoes: "",
  });

  const { data: contas = [], isLoading } = useContasFinanceiras(tab, statusFilter || undefined);
  const { data: resumo } = useResumoFinanceiro();
  const createMutation = useCreateContaFinanceira();
  const updateMutation = useUpdateContaFinanceira();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const handleOpenDialog = (conta?: ContaFinanceira) => {
    if (conta) {
      setEditingConta(conta);
      setFormData({
        tipo: conta.tipo,
        descricao: conta.descricao,
        valor: String(conta.valor),
        data_vencimento: conta.data_vencimento,
        categoria: conta.categoria || "",
        forma_pagamento: conta.forma_pagamento || "",
        observacoes: conta.observacoes || "",
      });
    } else {
      setEditingConta(null);
      setFormData({
        tipo: lockType ? initialTab : tab,
        descricao: "",
        valor: "",
        data_vencimento: "",
        categoria: "",
        forma_pagamento: "",
        observacoes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      valor: parseFloat(formData.valor),
      status: "pendente" as const,
      parcelas: 1,
      parcela_atual: 1,
      recorrente: false,
      data_pagamento: null,
      patient_id: null,
      fornecedor_id: null,
    };

    if (editingConta) {
      await updateMutation.mutateAsync({ id: editingConta.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleQuitar = async (conta: ContaFinanceira) => {
    await updateMutation.mutateAsync({
      id: conta.id,
      status: "pago",
      data_pagamento: new Date().toISOString().split("T")[0],
    });
  };

  const getStatusBadge = (status: string, vencimento: string) => {
    const hoje = new Date().toISOString().split("T")[0];
    if (status === "pago")
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    if (status === "cancelado") return <Badge variant="secondary">Cancelado</Badge>;
    if (vencimento < hoje)
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Atrasado
        </Badge>
      );
    if (vencimento === hoje)
      return (
        <Badge className="bg-yellow-500 text-white">
          <Clock className="h-3 w-3 mr-1" />
          Hoje
        </Badge>
      );
    return <Badge variant="outline">Pendente</Badge>;
  };

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

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              A Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-600">
              R${" "}
              {resumo?.totalReceber.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              }) || "0,00"}
            </div>
            {(resumo?.receberAtrasado || 0) > 0 && (
              <p className="text-[10px] font-bold text-destructive uppercase mt-1">
                {resumo?.receberAtrasado} atrasados
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              A Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-600">
              R${" "}
              {resumo?.totalPagar.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              }) || "0,00"}
            </div>
            {(resumo?.pagarAtrasado || 0) > 0 && (
              <p className="text-[10px] font-bold text-destructive uppercase mt-1">
                {resumo?.pagarAtrasado} atrasados
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Vencendo Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-500">
              {(resumo?.receberHoje || 0) + (resumo?.pagarHoje || 0)}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
              Lançamentos
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black ${(resumo?.totalReceber || 0) - (resumo?.totalPagar || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}
            >
              R${" "}
              {((resumo?.totalReceber || 0) - (resumo?.totalPagar || 0)).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
              Saldo Final
            </p>
          </CardContent>
        </Card>
      </div>

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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
                      <TableRow className="border-none">
                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                          Descrição
                        </TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                          Categoria
                        </TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                          Vencimento
                        </TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                          Valor
                        </TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">
                          Status
                        </TableHead>
                        <TableHead className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contas.map((conta) => (
                        <TableRow
                          key={conta.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all border-slate-50 dark:border-slate-800/50"
                        >
                          <TableCell className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                            {conta.descricao}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
                            {conta.categoria || "-"}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-mono text-slate-500">
                            {format(new Date(conta.data_vencimento), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell
                            className={`px-6 py-4 font-black ${tab === "receber" ? "text-emerald-600" : "text-red-600"}`}
                          >
                            R${" "}
                            {Number(conta.valor).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {getStatusBadge(conta.status, conta.data_vencimento)}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            {conta.status === "pendente" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuitar(conta)}
                                className="h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-bold text-[10px] uppercase tracking-wider"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                Quitar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tighter">
              {editingConta ? "Editar Lançamento" : "Novo Lançamento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tipo
                </Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      tipo: v as "receber" | "pagar",
                    }))
                  }
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="receber">Entrada (A Receber)</SelectItem>
                    <SelectItem value="pagar">Saída (A Pagar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Valor (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, valor: e.target.value }))}
                  className="rounded-xl h-11"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Descrição
              </Label>
              <Input
                value={formData.descricao}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    descricao: e.target.value,
                  }))
                }
                className="rounded-xl h-11"
                placeholder="Ex: Aluguel da Sala"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Vencimento
                </Label>
                <Input
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      data_vencimento: e.target.value,
                    }))
                  }
                  className="rounded-xl h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Categoria
                </Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Observações
              </Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    observacoes: e.target.value,
                  }))
                }
                className="rounded-xl min-h-[80px]"
              />
            </div>
            <DialogFooter className="gap-2 pt-4">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsDialogOpen(false)}
                className="rounded-xl h-11 font-bold text-xs uppercase tracking-wider border-slate-200"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-xl h-11 font-bold text-xs uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
              >
                {editingConta ? "Salvar Alterações" : "Confirmar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
