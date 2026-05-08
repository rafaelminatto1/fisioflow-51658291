import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2 } from "lucide-react";

interface ReciboSettingsProps {
  receiptConfig: {
    custom_issuer_name: string;
    custom_professional_name: string;
    disclaimer_text: string;
    show_disclaimer: boolean;
    assinado_padrao: boolean;
  };
  setReceiptConfig: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
  isUpdating: boolean;
}

export function ReciboSettings({
  receiptConfig,
  setReceiptConfig,
  onSave,
  isUpdating,
}: ReciboSettingsProps) {
  return (
    <Card className="max-w-2xl mx-auto rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Configurações do Recibo
          </CardTitle>
          <Button
            onClick={onSave}
            disabled={isUpdating}
            size="sm"
            className="rounded-xl shadow-lg gap-2"
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Nome da Clínica / Empresa (No Recibo)
            </Label>
            <Input
              value={receiptConfig.custom_issuer_name}
              onChange={(e) =>
                setReceiptConfig((prev: any) => ({ ...prev, custom_issuer_name: e.target.value }))
              }
              className="rounded-xl border-slate-200 dark:border-slate-800 h-11"
              placeholder="Nome exibido como emissor"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Nome do Profissional Responsável
            </Label>
            <Input
              value={receiptConfig.custom_professional_name}
              onChange={(e) =>
                setReceiptConfig((prev: any) => ({
                  ...prev,
                  custom_professional_name: e.target.value,
                }))
              }
              className="rounded-xl border-slate-200 dark:border-slate-800 h-11"
              placeholder="Ex: Dr. Fulano de Tal"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Texto de Disclaimer / Rodapé
            </Label>
            <Textarea
              value={receiptConfig.disclaimer_text}
              onChange={(e) =>
                setReceiptConfig((prev: any) => ({ ...prev, disclaimer_text: e.target.value }))
              }
              className="rounded-xl border-slate-200 dark:border-slate-800 min-h-[100px] resize-none"
            />
          </div>

          <div className="flex flex-col gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Mostrar Disclaimer</Label>
                <p className="text-[10px] text-slate-400 font-medium">Exibir texto de rodapé legal no PDF</p>
              </div>
              <Switch
                checked={receiptConfig.show_disclaimer}
                onCheckedChange={(checked) =>
                  setReceiptConfig((prev: any) => ({ ...prev, show_disclaimer: checked }))
                }
              />
            </div>
            
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Assinado por Padrão</Label>
                <p className="text-[10px] text-slate-400 font-medium">Marcar recibos como assinados automaticamente</p>
              </div>
              <Switch
                checked={receiptConfig.assinado_padrao}
                onCheckedChange={(checked) =>
                  setReceiptConfig((prev: any) => ({ ...prev, assinado_padrao: checked }))
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
