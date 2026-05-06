import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "fisioflow_setup_checklist";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  route: string;
  cta: string;
}

const ITEMS: ChecklistItem[] = [
  {
    id: "schedule",
    label: "Configure sua agenda",
    description: "Defina seus horários disponíveis para atendimento",
    route: "/agenda",
    cta: "Ir para Agenda",
  },
  {
    id: "patients",
    label: "Adicione seus pacientes",
    description: "Importe ou cadastre seus pacientes no sistema",
    route: "/patients/new",
    cta: "Novo Paciente",
  },
  {
    id: "whatsapp",
    label: "Configure o WhatsApp",
    description: "Lembretes automáticos 48h e no dia da sessão",
    route: "/whatsapp/automations",
    cta: "Configurar WhatsApp",
  },
  {
    id: "packages",
    label: "Crie pacotes de sessão",
    description: "Venda tratamentos completos e aumente o ticket médio",
    route: "/financeiro/contas",
    cta: "Criar Pacotes",
  },
  {
    id: "nfse",
    label: "Ative a emissão de NFS-e",
    description: "Emita notas fiscais diretamente pelo sistema",
    route: "/financeiro/nfse",
    cta: "Configurar NFS-e",
  },
];

function loadState(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveState(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function SetupChecklist() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>(loadState);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY}_dismissed`) === "true";
  });

  const completedCount = ITEMS.filter((i) => checked[i.id]).length;
  const progress = Math.round((completedCount / ITEMS.length) * 100);
  const allDone = completedCount === ITEMS.length;

  useEffect(() => {
    if (allDone) {
      // Auto-dismiss 2s after completing all items
      const t = setTimeout(() => {
        setDismissed(true);
        localStorage.setItem(`${STORAGE_KEY}_dismissed`, "true");
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [allDone]);

  if (dismissed) return null;

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveState(next);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(`${STORAGE_KEY}_dismissed`, "true");
  };

  return (
    <Card className="border border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Configuração Inicial
            <span className="text-xs font-normal text-muted-foreground">
              {completedCount}/{ITEMS.length} concluídos
            </span>
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Progress value={progress} className="h-1.5 mt-1" />
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        {ITEMS.map((item) => {
          const done = !!checked[item.id];
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg group transition-colors",
                done ? "opacity-60" : "hover:bg-muted/50 cursor-pointer",
              )}
            >
              <button
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => toggle(item.id)}
              >
                {done ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                ) : (
                  <Circle className="h-4.5 w-4.5" />
                )}
              </button>
              <div className="flex-1 min-w-0" onClick={() => !done && navigate(item.route)}>
                <p className={cn("text-sm font-medium truncate", done && "line-through text-muted-foreground")}>
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
              </div>
              {!done && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => navigate(item.route)}
                >
                  {item.cta}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          );
        })}

        {allDone && (
          <p className="text-xs text-center text-green-600 font-medium pt-1">
            🎉 Configuração completa! Você está pronto para usar o FisioFlow.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
