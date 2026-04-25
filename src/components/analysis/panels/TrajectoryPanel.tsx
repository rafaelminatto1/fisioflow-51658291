import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { TrackedTraj, KP_GROUPS, KP_NAMES } from "@/types/biomechanics";

interface TrajectoryPanelProps {
  trackedTrajs: TrackedTraj[];
  aiEnabled: boolean;
  removeTrajectory: (index: number) => void;
  addTrajectory: (kpIdx: number | null) => void;
  removeTrajectoryByKeypoint: (kpIdx: number) => void;
  clearTrajectories: () => void;
}

export const TrajectoryPanel: React.FC<TrajectoryPanelProps> = ({
  trackedTrajs,
  aiEnabled,
  removeTrajectory,
  addTrajectory,
  removeTrajectoryByKeypoint,
  clearTrajectories,
}) => {
  return (
    <Card className="border-none shadow-sm bg-orange-500/5">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
          <TrendingUp className="h-3 w-3" /> Rastreamento de Ponto
        </h4>
        {aiEnabled ? (
          <div className="space-y-2">
            <p className="text-[9px] text-green-500 font-bold uppercase">
              AI ON — Selecione o ponto a rastrear:
            </p>
            {KP_GROUPS.map((grp) => (
              <div key={grp.label} className="space-y-1">
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                  {grp.label}
                </p>
                <div className="flex flex-wrap gap-1">
                  {grp.indices.map((kpIdx) => {
                    const tracked = trackedTrajs.find((t) => t.keypointIdx === kpIdx);
                    return (
                      <button
                        key={kpIdx}
                        className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${tracked ? "border-transparent text-white" : "border-border hover:bg-muted/30"}`}
                        style={tracked ? { backgroundColor: tracked.color } : undefined}
                        onClick={() =>
                          tracked ? removeTrajectoryByKeypoint(kpIdx) : addTrajectory(kpIdx)
                        }
                      >
                        {KP_NAMES[kpIdx]}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[9px] text-amber-500 font-medium">
              Ligue AI para rastreamento automático
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full h-7 text-[9px] font-bold"
              onClick={() => addTrajectory(null)}
            >
              + Trajetória Manual (clique no vídeo)
            </Button>
          </div>
        )}
        {trackedTrajs.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-orange-500/10">
            <p className="text-[9px] font-black uppercase text-muted-foreground">
              Ativas ({trackedTrajs.length})
            </p>
            {trackedTrajs.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-[9px] font-bold">{t.label}</span>
                  <span className="text-[8px] text-muted-foreground">{t.points.length}pts</span>
                </div>
                <button
                  className="text-[9px] text-red-400 hover:text-red-600"
                  onClick={() => removeTrajectory(i)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              className="w-full text-[9px] text-muted-foreground hover:text-foreground mt-1"
              onClick={() => clearTrajectories()}
            >
              Limpar todas
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
