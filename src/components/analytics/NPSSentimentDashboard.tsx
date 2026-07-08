import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/api/v2/base";
import { Smile, Meh, Frown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface NPSSurvey {
  id: string;
  patient_name: string;
  nps_score: number;
  comments: string;
  ai_sentiment: "positive" | "neutral" | "negative";
  ai_summary: string;
  ai_urgency_alert: boolean;
  responded_at: string;
}

export function NPSSentimentDashboard() {
  const { data: surveysRes, isLoading } = useQuery({
    queryKey: ["nps-sentiment-bi"],
    queryFn: () => request<{ data: NPSSurvey[] }>("/api/satisfaction-surveys/latest-feedbacks"),
    staleTime: 1000 * 60 * 15, // 15 mins
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Analisando sentimento dos feedbacks...
      </div>
    );
  }

  const surveys = surveysRes?.data || [];

  const sentimentStats = {
    positive: surveys.filter((s) => s.ai_sentiment === "positive").length,
    neutral: surveys.filter((s) => s.ai_sentiment === "neutral").length,
    negative: surveys.filter((s) => s.ai_sentiment === "negative").length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-none shadow-premium bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Smile className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest">
                  Positivos
                </p>
                <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                  {sentimentStats.positive}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-premium bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Meh className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-amber-700 tracking-widest">
                  Neutros
                </p>
                <h3 className="text-2xl font-black text-amber-900 dark:text-amber-100">
                  {sentimentStats.neutral}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-premium bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Frown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-[10px] font-black uppercase text-red-700 tracking-widest">
                  Negativos
                </p>
                <h3 className="text-2xl font-black text-red-900 dark:text-red-100">
                  {sentimentStats.negative}
                </h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {surveys.map((s) => (
          <Card
            key={s.id}
            className={cn(
              "border-none shadow-sm",
              s.ai_urgency_alert
                ? "border-l-4 border-red-500 bg-red-50/30"
                : "bg-white dark:bg-slate-900/50",
            )}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{s.patient_name || "Paciente"}</span>
                  <span
                    className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded",
                      s.nps_score >= 9
                        ? "bg-emerald-100 text-emerald-700"
                        : s.nps_score <= 6
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700",
                    )}
                  >
                    NPS {s.nps_score}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {s.ai_sentiment === "positive" && <Smile className="h-3 w-3 text-emerald-500" />}
                  {s.ai_sentiment === "neutral" && <Meh className="h-3 w-3 text-amber-500" />}
                  {s.ai_sentiment === "negative" && <Frown className="h-3 w-3 text-red-500" />}
                  {s.ai_urgency_alert && (
                    <AlertCircle className="h-3 w-3 text-red-600 animate-pulse" />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3 italic">"{s.comments}"</p>
              <div className="p-2 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50">
                <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                  RESUMO IA: {s.ai_summary}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
