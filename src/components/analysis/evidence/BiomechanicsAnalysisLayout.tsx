import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PageLayout, PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { biomechanicsProtocols } from "@/data/biomechanicsEvidence";
import { BiomechanicsEvidencePanel } from "./BiomechanicsEvidencePanel";
import { BiomechanicsProtocolGuidePanel } from "./BiomechanicsProtocolGuidePanel";
import { BiomechanicsTemplateLibraryPanel } from "./BiomechanicsTemplateLibraryPanel";
import { MedicalDisclaimer } from "@/components/clinical/MedicalDisclaimer";
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
    <PageLayout>
      <PageHeader
        title={title}
        description={subtitle}
        icon={Icon}
        breadcrumb={[
          { label: "Biomecânica", href: "/clinical/biomechanics" },
          { label: title, href: "#" },
        ]}
        actions={
          <Button variant="outline" size="sm" className="gap-2 rounded-2xl font-bold border-brand-blue/20 text-brand-blue">
            <FileText className="h-4 w-4" />
            Relatório
          </Button>
        }
      />

      <PageContainer>
        <MedicalDisclaimer className="mb-6" />
        
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="space-y-2 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Preparação rápida
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {protocol.preparationChecklist[0]}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="space-y-2 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                    Captura recomendada
                  </p>
                  <p className="text-sm font-medium text-slate-700">{protocol.captureAngles[0]}</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm bg-white">
                <CardContent className="space-y-2 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    Saída principal
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {protocol.measuredOutputs[0]}
                  </p>
                </CardContent>
              </Card>
            </div>
            {children}
          </div>
          
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <BiomechanicsProtocolGuidePanel mode={mode} />
            <BiomechanicsTemplateLibraryPanel mode={mode} />
            <BiomechanicsEvidencePanel mode={mode} />
          </div>
        </div>
      </PageContainer>
    </PageLayout>
  );
}
