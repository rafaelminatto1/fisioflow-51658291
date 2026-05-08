import React, { useState, useEffect } from "react";
import { Brain, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getWorkersApiUrl } from "@/lib/api/config";

interface EvidenceTabProps {
  patient: any;
}

const SOURCE_BADGE_MAP: Record<string, { label: string; className: string }> = {
  paper: { label: "Artigo", className: "bg-violet-100 text-violet-700 border-violet-200" },
  wiki: { label: "Wiki", className: "bg-blue-100 text-blue-700 border-blue-200" },
  protocol: { label: "Protocolo", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  exercise: { label: "Exercício", className: "bg-amber-100 text-amber-700 border-amber-200" },
};

export const EvidenceTab = ({ patient }: EvidenceTabProps) => {
  const [evidenceQuery, setEvidenceQuery] = useState<string>("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceResult, setEvidenceResult] = useState<{
    answer: string;
    sources: Array<{ id: string; title: string; source: string; excerpt: string }>;
  } | null>(null);

  useEffect(() => {
    if (patient && !evidenceQuery) {
      const condition = patient.main_condition || patient.diagnosis || "";
      if (condition) setEvidenceQuery(condition);
    }
  }, [patient]);

  async function searchEvidence() {
    if (!evidenceQuery.trim() || evidenceQuery.trim().length < 3) return;
    setEvidenceLoading(true);
    try {
      const params = new URLSearchParams({ q: evidenceQuery.trim() });
      const res = await fetch(`${getWorkersApiUrl()}/api/fisiobrain/search?${params}`);
      const json = await res.json();
      setEvidenceResult(json);
    } catch {
      // silent
    } finally {
      setEvidenceLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 border border-violet-100 shadow-sm">
      <h3 className="text-lg font-bold flex items-center gap-2 text-violet-700 mb-4">
        <Brain className="h-5 w-5" />
        Evidência Clínica — FisioBrain
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Busque artigos científicos, protocolos e exercícios baseados no diagnóstico do paciente.
      </p>
      <div className="flex flex-col gap-3 max-w-2xl">
        <Textarea
          className="resize-none text-sm"
          rows={3}
          placeholder="Ex: lombalgia crônica, síndrome do impacto do ombro..."
          value={evidenceQuery}
          onChange={(e) => setEvidenceQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              searchEvidence();
            }
          }}
        />
        <Button
          className="gap-2 bg-violet-600 hover:bg-violet-700 text-white self-start"
          onClick={searchEvidence}
          disabled={evidenceLoading || evidenceQuery.trim().length < 3}
        >
          {evidenceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {evidenceLoading ? "Buscando..." : "Buscar Evidência"}
        </Button>

        {evidenceResult && (
          <div className="flex flex-col gap-4 mt-2">
            {evidenceResult.answer && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm text-violet-900 leading-relaxed">{evidenceResult.answer}</p>
              </div>
            )}
            {evidenceResult.sources.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fontes</p>
                {evidenceResult.sources.map((src) => {
                  const badge = SOURCE_BADGE_MAP[src.source] ?? { label: src.source, className: "bg-gray-100 text-gray-700 border-gray-200" };
                  return (
                    <div key={src.id} className="rounded-xl border p-3 bg-white flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs border ${badge.className}`}>{badge.label}</Badge>
                        <span className="text-sm font-medium">{src.title}</span>
                      </div>
                      {src.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{src.excerpt}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
