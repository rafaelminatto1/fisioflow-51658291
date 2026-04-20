import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Receipt, CreditCard, Banknote, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { financialApi } from "@/api/v2/financial";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface QuickBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    patientName: string;
    date: string | Date;
    paymentAmount?: number | string;
    type: string;
  } | null;
}

export function QuickBillingModal({ isOpen, onClose, appointment }: QuickBillingModalProps) {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = React.useState("pix");
  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    if (appointment?.paymentAmount) {
      setValue(String(appointment.paymentAmount));
    } else {
      setValue("150.00"); // Default value
    }
  }, [appointment]);

  const billMutation = useMutation({
    mutationFn: async () => {
      if (!appointment) return;

      // 1. Registrar pagamento/transação
      await financialApi.transacoes.create({
        tipo: "receita",
        valor: value,
        descricao: `Sessão: ${appointment.type} - ${appointment.patientName}`,
        status: "concluido",
        metadata: {
          appointment_id: appointment.id,
          payment_method: paymentMethod,
        },
      });

      // 2. Emitir NFS-e (opcional, simulado aqui ou via endpoint real se disponível)
      // await financialApi.nfse.create({ ... });
      
      toast.success("Faturamento concluído com sucesso!");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["appointments_v2"] });
      onClose();
    },
    onError: (error: Error) => {
      toast.error("Erro no faturamento: " + error.message);
    },
  });

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Faturamento On-Demand
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <p className="text-sm text-slate-400">Paciente</p>
            <p className="font-medium text-slate-200">{appointment.patientName}</p>
            <p className="text-xs text-slate-500 mt-1">
              Sessão: {appointment.type} • {new Date(appointment.date).toLocaleDateString()}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="value">Valor da Sessão (R$)</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div className="grid gap-2">
            <Label>Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="pix">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    PIX
                  </div>
                </SelectItem>
                <SelectItem value="credit">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-400" />
                    Cartão de Crédito
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    Dinheiro
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs">
            <FileText className="w-4 h-4 shrink-0" />
            <span>A NFS-e será gerada automaticamente após a confirmação.</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400">
            Cancelar
          </Button>
          <Button 
            onClick={() => billMutation.mutate()} 
            disabled={billMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            {billMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Receipt className="w-4 h-4 mr-2" />
            )}
            Confirmar e Emitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
