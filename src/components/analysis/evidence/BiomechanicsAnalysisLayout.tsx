import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { biomechanicsProtocols } from "@/data/biomechanicsEvidence";
import { BiomechanicsEvidencePanel } from "./BiomechanicsEvidencePanel";
import { BiomechanicsProtocolGuidePanel } from "./BiomechanicsProtocolGuidePanel";
import { BiomechanicsTemplateLibraryPanel } from "./BiomechanicsTemplateLibraryPanel";
import type { BiomechanicsEvidenceMode } from "@/data/biomechanicsEvidence";

interface BiomechanicsAnalysisLayoutProps {
  mode: BiomechanicsEvidenceMode;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBgClassName: string;
  children: ReactNode;
}

export function BiomechanicsAnalysisLayout({
  mode,
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  iconBgClassName,
  children,
}: BiomechanicsAnalysisLayoutProps) {
  const navigate = useNavigate();
  const protocol = biomechanicsProtocols[mode];

  return (
    <MainLayout>
      <div className="min-h-screen bg-background/50 pb-20">
        <div className="sticky top-0 z-30 border-b bg-background/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/clinical/biomechanics")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border ${iconBgClassName}`}
              >
                <Icon className={`h-5 w-5 ${iconClassName}`} />
              </div>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tighter text-foreground">
                  {title}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Relatório
            </Button>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 min-h-[calc(100vh-140px)]">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-slate-200/70 shadow-sm">
                <CardContent className="space-y-2 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Preparação rápida
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {protocol.preparationChecklist[0]}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/70 shadow-sm">
                <CardContent className="space-y-2 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                    Captura recomendada
                  </p>
                  <p className="text-sm font-medium text-foreground">{protocol.captureAngles[0]}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200/70 shadow-sm">
                <CardContent className="space-y-2 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    Saída principal
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {protocol.measuredOutputs[0]}
                  </p>
                </CardContent>
              </Card>
            </div>
            {children}
          </div>
          <div className="space-y-6 xl:sticky xl:top-28 xl:self-start">
            <BiomechanicsProtocolGuidePanel mode={mode} />
            <BiomechanicsTemplateLibraryPanel mode={mode} />
            <BiomechanicsEvidencePanel mode={mode} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
