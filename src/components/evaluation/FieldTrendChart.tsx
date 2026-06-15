import React from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldTrendChartProps {
  data: Array<{ date: string; value: number }>;
  className?: string;
  inverseLogic?: boolean; // Se true, menor é melhor (ex: Dor)
}

export const FieldTrendChart: React.FC<FieldTrendChartProps> = ({
  data,
  className,
  inverseLogic = false,
}) => {
  if (!data || data.length < 2) return null;

  const firstVal = data[0].value;
  const lastVal = data[data.length - 1].value;
  const diff = lastVal - firstVal;

  let trend: "up" | "down" | "flat" = "flat";
  if (diff > 0) trend = "up";
  if (diff < 0) trend = "down";

  // Determinar a cor baseada na lógica (Dor caindo = verde, Força caindo = vermelho)
  let colorClass = "text-slate-400";
  let strokeColor = "#94a3b8";

  if (trend === "up") {
    colorClass = inverseLogic ? "text-rose-500" : "text-emerald-500";
    strokeColor = inverseLogic ? "#f43f5e" : "#10b981";
  } else if (trend === "down") {
    colorClass = inverseLogic ? "text-emerald-500" : "text-rose-500";
    strokeColor = inverseLogic ? "#10b981" : "#f43f5e";
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800",
        className,
      )}
      title="Tendência do histórico"
    >
      <div
        className={cn("flex items-center gap-1 text-xs font-black tracking-tighter", colorClass)}
      >
        <TrendIcon className="h-3.5 w-3.5" />
        {diff > 0 ? "+" : ""}
        {diff.toFixed(1).replace(/\.0$/, "")}
      </div>
      <div className="h-6 w-16 opacity-70">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
