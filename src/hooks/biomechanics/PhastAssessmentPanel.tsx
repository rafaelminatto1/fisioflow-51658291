import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FunctionalAssessment, JointAngle } from "../../../types/biomechanics";
import { TrendingUp, Info } from "lucide-react";

interface PhastAssessmentPanelProps {
  assessment: FunctionalAssessment;
  autoAngles: JointAngle[];
  onUpdate: (data: Partial<FunctionalAssessment>) => void;
}

export const PhastAssessmentPanel: React.FC<PhastAssessmentPanelProps> = ({
  assessment,
  autoAngles,
  onUpdate,
}) => {
  const renderYBalance = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {["Anterior", "Postero-Medial", "Postero-Lateral"].map((dir) => (
          <div
            key={dir}
            className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5"
          >
            <span className="text-[10px] font-bold text-white/60 uppercase">{dir}</span>
            <input
              type="number"
              placeholder="cm"
              className="w-16 bg-transparent text-right text-xs font-black text-white focus:outline-none"
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onUpdate({ metrics: { ...assessment.metrics, [dir]: val } });
              }}
            />
          </div>
        ))}
      </div>
      {assessment.metrics.Anterior &&
        assessment.metrics["Postero-Medial"] &&
        assessment.metrics["Postero-Lateral"] && (
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[8px] font-black text-indigo-400 uppercase">Composite Score</p>
                <p className="text-xl font-black text-white">
                  {(
                    (assessment.metrics.Anterior +
                      assessment.metrics["Postero-Medial"] +
                      assessment.metrics["Postero-Lateral"]) /
                    3
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-none text-[8px]">
                BAIXO RISCO
              </Badge>
            </div>
          </div>
        )}
    </div>
  );

  const renderLESS = () => {
    const kneeValgusAngle =
      autoAngles.find((a) => a.name === "left_knee" || a.name === "right_knee")?.value || 0;
    const isValgus = kneeValgusAngle > 0 && kneeValgusAngle < 165; // High threshold for valgus risk

    return (
      <div className="space-y-3">
        <div className="p-3 bg-slate-900/50 rounded-xl border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/70">KNEE VALGUS (AI)</span>
            <Badge
              variant="outline"
              className={
                isValgus ? "text-red-500 border-red-500/30" : "text-green-500 border-green-500/30"
              }
            >
              {isValgus ? "ALTO RISCO" : "NORMAL"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/70">TRUNK LEAN (AI)</span>
            <span className="text-xs font-black text-white">
              {autoAngles.find((a) => a.name === "trunk_lean")?.value || 0}°
            </span>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { label: "Initial Contact: Flat foot?", key: "flat_foot" },
            { label: "Lateral trunk lean?", key: "trunk_lean_less" },
            { label: "Asymmetric landing?", key: "asymmetric_landing" },
            { label: "Stiff landing (no flexion)?", key: "stiff_landing" },
          ].map((item, i) => (
            <label
              key={i}
              className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={!!assessment.metrics[item.key]}
                onChange={(e) =>
                  onUpdate({ metrics: { ...assessment.metrics, [item.key]: e.target.checked } })
                }
                className="rounded border-white/20 bg-transparent text-indigo-600 focus:ring-indigo-500 h-3 w-3"
              />
              <span className="text-[10px] font-medium text-white/60">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-none bg-slate-900 shadow-2xl overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> Dashboard de Execução
          </h4>
          <Badge
            variant="outline"
            className="text-[8px] font-black border-indigo-500/30 text-indigo-400"
          >
            {assessment.type.toUpperCase()}
          </Badge>
        </div>

        {assessment.type === "y-balance" && renderYBalance()}
        {assessment.type === "less" && renderLESS()}
        {assessment.type === "hop-test" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-[9px] text-amber-200 uppercase font-black tracking-tight">
                Insira a distância alcançada para cada membro.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-white/40 mb-1 uppercase">ESQUERDO (m)</p>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-transparent text-lg font-black text-white focus:outline-none"
                  onChange={(e) =>
                    onUpdate({
                      metrics: { ...assessment.metrics, left: parseFloat(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[8px] font-black text-white/40 mb-1 uppercase">DIREITO (m)</p>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-transparent text-lg font-black text-white focus:outline-none"
                  onChange={(e) =>
                    onUpdate({
                      metrics: { ...assessment.metrics, right: parseFloat(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
            {assessment.metrics.left && assessment.metrics.right && (
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex justify-between items-center">
                <div>
                  <p className="text-[8px] font-black text-indigo-400 uppercase">LSI (Index)</p>
                  <p className="text-xl font-black text-white">
                    {Math.min(
                      (assessment.metrics.left / assessment.metrics.right) * 100,
                      (assessment.metrics.right / assessment.metrics.left) * 100,
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-none text-[8px]">
                  {(Math.abs(assessment.metrics.left - assessment.metrics.right) /
                    Math.max(assessment.metrics.left, assessment.metrics.right)) *
                    100 >
                  15
                    ? "ASSIMETRIA ALTA"
                    : "NORMAL"}
                </Badge>
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          className="w-full border-white/10 hover:bg-white/5 text-[10px] font-black h-9 rounded-xl text-white/60"
          onClick={() => onUpdate({ status: "completed" })}
        >
          FINALIZAR AVALIAÇÃO
        </Button>
      </CardContent>
    </Card>
  );
};
