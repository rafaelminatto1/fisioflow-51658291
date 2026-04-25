import { ClipboardList, HelpCircle, PlayCircle, ScrollText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BiomechanicsEvidenceMode } from "@/data/biomechanicsEvidence";
import { biomechanicsProtocols } from "@/data/biomechanicsEvidence";

export function BiomechanicsTemplateLibraryPanel({ mode }: { mode: BiomechanicsEvidenceMode }) {
  const protocol = biomechanicsProtocols[mode];

  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" />
          Templates clínicos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Protocolos prontos para acelerar a captura e padronizar o relatório.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {protocol.guidedTemplates.map((template) => (
          <div
            key={template.id}
            className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{template.title}</p>
                <p className="text-xs text-muted-foreground">{template.goal}</p>
              </div>
              <PlayCircle className="mt-0.5 h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">Captura:</span>{" "}
                {template.capturePreset}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Ideal para:</span>{" "}
                {template.idealFor}
              </p>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {template.checklist.slice(0, 2).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3 rounded-xl bg-slate-50/80 p-3 text-xs">
              <div>
                <p className="mb-1 flex items-center gap-1 font-semibold text-slate-800">
                  <ScrollText className="h-3.5 w-3.5 text-sky-600" />
                  Foco do relatório
                </p>
                <p className="text-muted-foreground">{template.reportFocus.join(" • ")}</p>
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1 font-semibold text-slate-800">
                  <HelpCircle className="h-3.5 w-3.5 text-amber-600" />
                  Perguntas clínicas
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {template.clinicalQuestions.slice(0, 2).map((question) => (
                    <li key={question}>• {question}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
