import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";
import type { DemonstrativoData } from "@/hooks/useDemonstrativoMensalLogic";

interface Props {
  demoData: DemonstrativoData;
}

export function RevenueFunnel({ demoData }: Props) {
  const taxes = demoData.entradas * 0.06;
  const netProfit = demoData.entradas * 0.94 - demoData.saidas;

  const funnelItems = [
    { label: "Receita Bruta", value: demoData.entradas, color: "bg-green-500" },
    { 
      label: "Impostos estimados (6% ISS + IRPJ simples)", 
      value: taxes, 
      color: "bg-yellow-400", 
      deduct: true 
    },
    { 
      label: "Custos fixos estimados (Saídas)", 
      value: demoData.saidas, 
      color: "bg-red-400", 
      deduct: true 
    },
    { 
      label: "Lucro Líquido Estimado", 
      value: netProfit, 
      color: netProfit >= 0 ? "bg-emerald-600" : "bg-red-600", 
      highlight: true 
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Funil de Resultado (Estimativa)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelItems.map(({ label, value, color, deduct, highlight }) => (
            <div 
              key={label} 
              className={`flex items-center justify-between p-3 rounded-lg ${highlight ? "bg-muted/80 font-bold" : "bg-muted/40"}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-sm">{label}</span>
              </div>
              <span className={`font-mono text-sm ${deduct ? "text-red-600" : highlight ? "text-primary" : "text-green-600"}`}>
                {deduct ? "- " : ""}R$ {Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">* Impostos baseados em estimativa do Simples Nacional. Consulte seu contador.</p>
      </CardContent>
    </Card>
  );
}
