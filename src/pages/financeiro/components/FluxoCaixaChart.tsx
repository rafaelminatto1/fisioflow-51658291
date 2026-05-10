import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { SafeResponsiveContainer } from "@/components/charts/SafeResponsiveContainer";

interface Props {
  data: any[];
}

export function FluxoCaixaChart({ data }: Props) {
  return (
    <Card className="rounded-2xl border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="p-6 pb-0">
        <CardTitle className="text-sm font-black uppercase tracking-[0.1em] text-slate-400">
          Evolução Mensal de Caixa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[350px] w-full">
          <SafeResponsiveContainer className="h-full" minHeight={350}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: "bold" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: "bold" }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{
                  paddingBottom: "20px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                }}
              />
              <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="acumulado" name="Acumulado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </SafeResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
