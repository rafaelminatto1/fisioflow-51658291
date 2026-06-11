import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, BadgeCheck, Settings } from "lucide-react";
import { ReceiptOCR } from "@/components/financial/ReceiptOCR";

interface ReciboFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  pacientes: any[];
  clinicaConfig: any;
  handleOCRExtracted: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function ReciboForm({
  formData,
  setFormData,
  pacientes,
  clinicaConfig,
  handleOCRExtracted,
  onSubmit,
  isSubmitting,
}: ReciboFormProps) {
  return (
    <Card className="max-w-2xl mx-auto rounded-2xl border-none shadow-premium-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50">
        <CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Emitir Novo Recibo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        <div className="mb-8">
          <ReceiptOCR onDataExtracted={handleOCRExtracted} />
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {formData.card_last_digits && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-center gap-3 animate-in fade-in zoom-in duration-500">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Plus className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  Novo Cartão: **** {formData.card_last_digits}
                </p>
                <p className="text-xs font-bold text-amber-600/80">
                  Vincule a um paciente para automatizar o próximo faturamento.
                </p>
              </div>
            </div>
          )}

          {(formData.is_first_payment || (formData.valor && Number(formData.valor) > 0)) && (
            <div className="space-y-4 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Classificação Inteligente
                </h4>
                {formData.is_first_payment && (
                  <Badge className="bg-emerald-500 text-white border-none text-[9px] uppercase font-black">
                    Primeiro Pagamento
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-400">
                    Tipo de Atendimento
                  </Label>
                  <Select
                    onValueChange={(v) => {
                      const patient = pacientes.find((p) => p.id === formData.patient_id);
                      const name = patient?.full_name || "";
                      setFormData((prev: any) => ({
                        ...prev,
                        referente: `${v} - ${name}`,
                      }));
                    }}
                  >
                    <SelectTrigger className="rounded-xl h-10 bg-white">
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Avaliação Inicial">Avaliação Inicial</SelectItem>
                      <SelectItem value="Sessão de Fisioterapia">Sessão Individual</SelectItem>
                      <SelectItem value="Recovery Esportivo">Recovery</SelectItem>
                      <SelectItem value="Pacote de Tratamento">Pacote de Tratamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {Number(formData.valor) >= 300 && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400">
                      Qtd. Sessões no Pacote
                    </Label>
                    <Select
                      defaultValue="10"
                      onValueChange={(v) =>
                        setFormData((prev: any) => ({
                          ...prev,
                          package_sessions: v,
                          is_package: true,
                        }))
                      }
                    >
                      <SelectTrigger className="rounded-xl h-10 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="5">05 Sessões</SelectItem>
                        <SelectItem value="10">10 Sessões (Padrão)</SelectItem>
                        <SelectItem value="12">12 Sessões</SelectItem>
                        <SelectItem value="20">20 Sessões</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Paciente
            </Label>
            <Select
              value={formData.patient_id}
              onValueChange={(v) => setFormData({ ...formData, patient_id: v })}
            >
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 h-11">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Data/Hora de Emissão
                </Label>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="omit-date"
                    checked={formData.omit_date}
                    onCheckedChange={(v) => setFormData({ ...formData, omit_date: v })}
                    className="scale-75"
                  />
                  <Label
                    htmlFor="omit-date"
                    className="text-[9px] font-bold text-slate-400 uppercase cursor-pointer"
                  >
                    Omitir
                  </Label>
                </div>
              </div>
              <Input
                type="datetime-local"
                disabled={formData.omit_date}
                value={formData.data_emissao}
                onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-800 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Valor (R$)*
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-black text-sm">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  required
                  className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 h-11 text-lg font-black"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Referente a *
            </Label>
            <Textarea
              placeholder="Ex: Sessão de fisioterapia realizada em..."
              value={formData.referente}
              onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
              required
              className="rounded-xl border-slate-200 dark:border-slate-800 min-h-[100px] resize-none bg-slate-50/50 dark:bg-slate-800/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              CPF/CNPJ do Pagador (Opcional)
            </Label>
            <Input
              placeholder="000.000.000-00"
              value={formData.cpf_cnpj_pagador}
              onChange={(e) => setFormData({ ...formData, cpf_cnpj_pagador: e.target.value })}
              className="rounded-xl border-slate-200 dark:border-slate-800 h-11"
            />
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="usar-clinica"
                  checked={formData.usar_dados_clinica}
                  onChange={(e) =>
                    setFormData({ ...formData, usar_dados_clinica: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-primary"
                />
                <Label
                  htmlFor="usar-clinica"
                  className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Usar dados da organização no cabeçalho
                </Label>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-1">
                Emissor:{" "}
                {formData.usar_dados_clinica
                  ? clinicaConfig?.org?.name || "Clínica"
                  : clinicaConfig?.profile?.full_name}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl h-12 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 shadow-xl font-bold uppercase tracking-wider gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-5 w-5" />
              )}
              Emitir Recibo Oficial
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
