import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { DollarSign, ChevronLeft, ChevronRight, CheckCircle2, Settings } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  useCommissionSummary,
  useCommissionConfig,
  useSetCommissionRate,
  useMarkCommissionPaid,
  type CommissionSummaryRow,
} from "@/hooks/useCommissions";

function getMonthLabel(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function navigateMonth(current: string, delta: number): string {
  const [y, m] = current.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface ConfigModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function ConfigModal({ open, onOpenChange }: ConfigModalProps) {
  const { data: configData } = useCommissionConfig();
  const setRate = useSetCommissionRate();
  const [therapistId, setTherapistId] = useState("");
  const [rate, setRate2] = useState("40");

  const handleSave = () => {
    if (!therapistId.trim()) return;
    setRate.mutate(
      { therapist_id: therapistId.trim(), commission_rate: Number(rate) },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar Comissão</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>ID do Terapeuta</Label>
            <Input
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
              placeholder="user_xxx ou UUID"
            />
          </div>
          <div className="space-y-1">
            <Label>Taxa de Comissão (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={rate}
              onChange={(e) => setRate2(e.target.value)}
            />
          </div>
          {configData?.data?.length ? (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Configurações ativas:</p>
              {configData.data.map((cfg) => (
                <div key={cfg.id} className="flex justify-between">
                  <span className="truncate max-w-[180px]">{cfg.therapist_id}</span>
                  <span>{cfg.commission_rate}%</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={setRate.isPending || !therapistId.trim()}>
            {setRate.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PayConfirmModalProps {
  row: CommissionSummaryRow | null;
  period: { start: string; end: string };
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function PayConfirmModal({
  row,
  period: _period,
  onConfirm,
  onCancel,
  isPending,
}: PayConfirmModalProps) {
  return (
    <Dialog
      open={Boolean(row)}
      onOpenChange={(v) => {
        if (!v) onCancel();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2 text-sm">
          <p>Registrar pagamento de comissão para:</p>
          <div className="bg-muted rounded p-3 space-y-1">
            <div className="flex justify-between">
              <span>Terapeuta:</span>
              <span className="font-mono text-xs truncate max-w-[160px]">{row?.therapist_id}</span>
            </div>
            <div className="flex justify-between">
              <span>Sessões:</span>
              <span>{row?.total_sessions}</span>
            </div>
            <div className="flex justify-between">
              <span>Receita:</span>
              <span>{formatCurrency(Number(row?.total_revenue ?? 0))}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Comissão ({row?.commission_rate}%):</span>
              <span>{formatCurrency(Number(row?.commission_amount ?? 0))}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? "Registrando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CommissionsDashboard() {
  const [month, setMonth] = useState(currentMonth);
  const [configOpen, setConfigOpen] = useState(false);
  const [payRow, setPayRow] = useState<CommissionSummaryRow | null>(null);

  const { data, isLoading } = useCommissionSummary(month);
  const markPaid = useMarkCommissionPaid();

  const rows = data?.data ?? [];
  const period = data?.period ?? { start: "", end: "" };

  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalCommission = rows.reduce((s, r) => s + Number(r.commission_amount), 0);
  const pendingCount = rows.filter((r) => r.payout_status === "pendente").length;

  const handlePay = () => {
    if (!payRow) return;
    markPaid.mutate(
      {
        therapist_id: payRow.therapist_id,
        period_start: period.start,
        period_end: period.end,
        total_sessions: Number(payRow.total_sessions),
        total_revenue: Number(payRow.total_revenue),
        commission_rate: Number(payRow.commission_rate),
        commission_amount: Number(payRow.commission_amount),
      },
      { onSuccess: () => setPayRow(null) },
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Comissões</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth((m) => navigateMonth(m, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center capitalize">
              {getMonthLabel(month)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonth((m) => navigateMonth(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="gap-2">
          <Settings className="h-4 w-4" />
          Configurar Taxas
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Terapeutas</p>
            <p className="text-2xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Receita Total</p>
            <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Comissões</p>
            <p className="text-2xl font-bold">{formatCurrency(totalCommission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Detalhamento por Terapeuta</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma sessão registrada no período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Terapeuta</TableHead>
                  <TableHead className="text-right">Sessões</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.therapist_id}>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">
                      {row.therapist_id}
                    </TableCell>
                    <TableCell className="text-right">{row.total_sessions}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(row.total_revenue))}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(row.commission_rate).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(row.commission_amount))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.payout_status === "pago" ? "default" : "secondary"}>
                        {row.payout_status === "pago" ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.payout_status === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => setPayRow(row)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Marcar pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
      <PayConfirmModal
        row={payRow}
        period={period}
        onConfirm={handlePay}
        onCancel={() => setPayRow(null)}
        isPending={markPaid.isPending}
      />
    </div>
  );
}
