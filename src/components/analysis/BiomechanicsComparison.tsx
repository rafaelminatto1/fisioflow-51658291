import { deltaExplanation, interpretDelta, LAUDO_DISCLAIMER } from "@fisioflow/core";
import React, { useState } from "react";
import { BiomechanicsAssessment } from "@/api/v2/biomechanics";
import { AnalyticalVideoPlayer } from "./video/AnalyticalVideoPlayer";
import { BiomechanicsOverlay } from "./canvas/BiomechanicsOverlay";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, TrendingUp } from "lucide-react";

interface BiomechanicsComparisonProps {
  baseAssessment: BiomechanicsAssessment;
  compareAssessment: BiomechanicsAssessment;
}

/**
 * Nomes de ângulo vindos de `analysisData.angles` para as chaves do
 * @fisioflow/core, que é onde vivem os limiares clínicos.
 *
 * "valgo" NÃO vira métrica de valgo de joelho: mapeia para `fppa`, porque é
 * isso que a medida 2D é. Lopes 2018 (JOSPT, meta-análise) achou r=0,127
 * (p=0,094) entre FPPA 2D e ângulo frontal 3D — chamar de valgo é erro de
 * categoria num laudo.
 */
function normalizarChaveMetrica(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("valgo") || n.includes("valgus") || n.includes("fppa")) return "fppa";
  if (n.includes("tronco") || n.includes("trunk")) return "trunk_inclination";
  if (n.includes("simetr") || n.includes("symmetr")) return "symmetry";
  if (n.includes("dor") || n.includes("pain")) return "pain";
  if (n.includes("quadril") || n.includes("hip")) return "hip_flexion";
  if (n.includes("tornozelo") || n.includes("ankle")) return "ankle_dorsiflexion";
  if (n.includes("joelho") || n.includes("knee"))
    return n.includes("rom") ? "knee_rom" : "knee_flexion";
  return n.replace(/[^a-z0-9]+/g, "_");
}

export const BiomechanicsComparison: React.FC<BiomechanicsComparisonProps> = ({
  baseAssessment,
  compareAssessment,
}) => {
  const [isGhostMode, setIsGhostMode] = useState(false);

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/50 shadow-sm">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4 text-primary" />
          Modo de Visualização
        </h3>
        <div className="flex items-center gap-3">
          <Label
            htmlFor="ghost-mode"
            className={`font-semibold text-xs cursor-pointer ${!isGhostMode ? "text-primary" : "text-muted-foreground"}`}
          >
            Lado a Lado
          </Label>
          <Switch id="ghost-mode" checked={isGhostMode} onCheckedChange={setIsGhostMode} />
          <Label
            htmlFor="ghost-mode"
            className={`font-semibold text-xs cursor-pointer ${isGhostMode ? "text-primary" : "text-muted-foreground"}`}
          >
            Ghost Mode (Sobreposição)
          </Label>
        </div>
      </div>

      {isGhostMode ? (
        <div className="relative w-full aspect-[4/3] md:aspect-video bg-black rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg group">
          <div className="absolute inset-0">
            <GhostAssessmentView assessment={baseAssessment} />
          </div>
          {/* Mix-blend-screen clareia o fundo sobreposto e destaca a diferença. Opacidade em 65% para manter a base visível */}
          <div className="absolute inset-0 z-10 pointer-events-none mix-blend-screen opacity-[0.65] transition-opacity duration-300 group-hover:opacity-80">
            <GhostAssessmentView assessment={compareAssessment} />
          </div>

          <div className="absolute top-4 left-4 z-20">
            <Badge variant="outline" className="bg-black/60 text-white border-white/20">
              Base (Anterior)
            </Badge>
          </div>
          <div className="absolute top-4 right-4 z-20">
            <Badge className="bg-primary/90 text-white shadow-md">Comparação (Atual)</Badge>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AssessmentView assessment={baseAssessment} label="Base (Anterior)" />
          <AssessmentView assessment={compareAssessment} label="Comparação (Atual)" />
        </div>
      )}

      {/* Delta Metrics Panel */}
      <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
        <h4 className="text-sm font-black uppercase tracking-tight mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Análise de Evolução (Delta)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(compareAssessment.analysisData.angles || {}).map(([name, currentVal]) => {
            const baseVal = baseAssessment.analysisData.angles?.[name];
            if (baseVal === undefined) return null;

            const delta = currentVal - baseVal;

            // A direção NÃO sai mais do sinal do delta.
            //
            // O comentário anterior aqui era "depende do contexto, mas
            // geralmente +ADM é bom" — e essa incerteza virava seta verde. Uma
            // variação de 3° em FPPA é menor que o erro de medição do método
            // (MDC 9,2°, Mansfield 2022), e pintá-la de verde afirma progresso
            // que o dado não sustenta.
            //
            // `interpretDelta` compara com a diferença mínima detectável
            // publicada por métrica e resolve também a polaridade: mais ROM é
            // melhor, menos FPPA é melhor.
            const leitura = interpretDelta(normalizarChaveMetrica(name), delta);
            const corDelta =
              leitura === "melhora"
                ? "text-emerald-500"
                : leitura === "piora"
                  ? "text-rose-500"
                  : "text-slate-400";

            return (
              <div
                key={name}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-primary/5 shadow-sm"
              >
                <p className="text-[10px] text-muted-foreground uppercase font-bold">{name}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-black">{currentVal.toFixed(1)}°</span>
                  <span className={`text-xs font-bold ${corDelta}`} title={deltaExplanation(normalizarChaveMetrica(name), delta)}>
                    {leitura === "sem_mudanca_detectavel" ? (
                      "sem mudança"
                    ) : (
                      <>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}°
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

        <p className="mt-4 pt-3 border-t border-primary/10 text-[10px] leading-relaxed text-muted-foreground">
          Variação abaixo da diferença mínima detectável do método aparece como
          &quot;sem mudança&quot; — não é possível distingui-la do erro de medição. Isso não
          significa que o paciente não evoluiu; significa que esta medida não consegue
          demonstrar. {LAUDO_DISCLAIMER}
        </p>
    </div>
  );
};

const AssessmentView: React.FC<{ assessment: BiomechanicsAssessment; label: string }> = ({
  assessment,
  label,
}) => {
  const isVideo = assessment.mediaUrl.endsWith(".mp4");

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="p-4 bg-muted/50">
        <div className="flex justify-between items-center">
          <Badge variant="outline">{label}</Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(assessment.createdAt), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </div>
        <CardTitle className="text-sm font-bold mt-2">
          {assessment.type.replace("_", " ").toUpperCase()}
        </CardTitle>
      </CardHeader>
      <div className="aspect-[3/4] relative bg-black">
        {isVideo ? (
          <AnalyticalVideoPlayer src={assessment.mediaUrl} showAnalysis={true} />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={assessment.mediaUrl}
              className="w-full h-full object-contain"
              alt="Static analysis"
            />
            <BiomechanicsOverlay
              landmarks={assessment.analysisData.landmarks || []}
              width={400} // This should be dynamic or fixed aspect
              height={533}
              showSkeleton={true}
              showAngles={true}
            />
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h4 className="text-xs font-bold uppercase text-muted-foreground">Métricas Chave</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(assessment.analysisData.angles || {}).map(([name, val]) => (
            <div key={name} className="bg-primary/5 p-2 rounded border border-primary/10">
              <p className="text-[10px] text-muted-foreground uppercase">{name}</p>
              <p className="text-sm font-bold">{val.toFixed(1)}°</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

const GhostAssessmentView: React.FC<{ assessment: BiomechanicsAssessment }> = ({ assessment }) => {
  const isVideo = assessment.mediaUrl.endsWith(".mp4");
  return (
    <div className="w-full h-full relative">
      {isVideo ? (
        <AnalyticalVideoPlayer src={assessment.mediaUrl} showAnalysis={true} />
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={assessment.mediaUrl}
            className="w-full h-full object-contain"
            alt="Static analysis"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <BiomechanicsOverlay
              landmarks={assessment.analysisData.landmarks || []}
              width={400}
              height={533}
              showSkeleton={true}
              showAngles={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
