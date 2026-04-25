import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Bell, UserX, Ban } from "lucide-react";

const NOSHOW_ACTIONS = [
  { value: "warning", label: "Apenas avisar" },
  { value: "block_online", label: "Bloquear agendamento online" },
  { value: "block_all", label: "Bloquear todos os agendamentos" },
  { value: "charge", label: "Cobrar taxa de no-show" },
] as const;

export function NoShowPolicyCard() {
  const [limit, setLimit] = useState(3);
  const [action, setAction] = useState<string>("warning");
  const [notifyPatient, setNotifyPatient] = useState(true);
  const [resetMonthly, setResetMonthly] = useState(true);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Pacientes que faltam sem aviso repetidamente podem ter restrições automáticas de
          agendamento.
        </p>
      </div>

      <div className="space-y-3 p-3 rounded-xl border bg-muted/30">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <UserX className="h-4 w-4 text-red-500" />
            Limite de faltas
          </Label>
          <Badge variant="outline" className="font-bold">
            {limit} no-show{limit !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Slider
          value={[limit]}
          onValueChange={([v]) => setLimit(v)}
          min={1}
          max={10}
          step={1}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Ban className="h-4 w-4 text-muted-foreground" />
          Ação ao atingir limite
        </Label>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecionar ação" />
          </SelectTrigger>
          <SelectContent>
            {NOSHOW_ACTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label className="text-sm font-medium">Notificar paciente</Label>
              <p className="text-xs text-muted-foreground">Enviar aviso a cada falta registrada</p>
            </div>
          </div>
          <Switch checked={notifyPatient} onCheckedChange={setNotifyPatient} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
          <div>
            <Label className="text-sm font-medium">Resetar contagem mensalmente</Label>
            <p className="text-xs text-muted-foreground">Contagem volta a zero a cada 30 dias</p>
          </div>
          <Switch checked={resetMonthly} onCheckedChange={setResetMonthly} />
        </div>
      </div>
    </div>
  );
}
