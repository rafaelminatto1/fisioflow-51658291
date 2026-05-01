import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface DigitalTwinProps {
  patientId: string;
}

export function DigitalTwinPanel({ patientId }: DigitalTwinProps) {
  // In a real implementation, this would use a hook like useDigitalTwin(patientId)
  // For now, we use simulated data based on the PRD specification
  
  const simulatedData = {
    proms_timeline: [
      { date: "2026-01-10", VAS: 8, PSFS: 3 },
      { date: "2026-02-15", VAS: 6, PSFS: 5 },
      { date: "2026-03-20", VAS: 4, PSFS: 7 },
      { date: "2026-04-25", VAS: 3, PSFS: 8 },
    ],
    adherence_score: 68,
    attendance_rate: 92,
    dropout_risk: "low",
    predicted_sessions: 6,
    ai_insights: [
      "Melhora consistente no VAS (-3 pts/mês)",
      "Aderência HEP acima da média para CID",
      "Previsão de alta: ~6 sessões",
    ]
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Aderência HEP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{simulatedData.adherence_score}%</div>
            <Progress value={simulatedData.adherence_score} className="h-2 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Comparecimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{simulatedData.attendance_rate}%</div>
            <Progress value={simulatedData.attendance_rate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">
              Risco de Abandono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold uppercase tracking-tight text-emerald-600">
                {simulatedData.dropout_risk}
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Baseado em comparativos CID-10</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução PROMs
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={simulatedData.proms_timeline}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="VAS" 
                stroke="#ef4444" 
                strokeWidth={3} 
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="PSFS" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Insights da IA (Gemini)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {simulatedData.ai_insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
          
          <div className="pt-2 border-t border-primary/10">
            <div className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Recomendação: manter frequência atual e progressão de carga no HEP.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
