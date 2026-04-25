import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import { GaitEvent, GaitMetrics } from "@/types/biomechanics";
import { oscillationZone, cadenceZone } from "@/utils/biomechanics-formulas";

interface GaitMetricsPanelProps {
  gaitEvents: GaitEvent[];
  setGaitEvents: React.Dispatch<React.SetStateAction<GaitEvent[]>>;
  currentFrame: number;
  gaitMetrics: GaitMetrics | null;
}

export const GaitMetricsPanel: React.FC<GaitMetricsPanelProps> = ({
  gaitEvents,
  setGaitEvents,
  currentFrame,
  gaitMetrics,
}) => {
  return (
    <Card className="border-none shadow-sm bg-green-500/5">
      <CardContent className="p-4 space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
          <Activity className="h-3 w-3" /> Gait Lab · Morin (2005)
        </h4>
        <div className="grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[9px] bg-green-500/10 font-black text-green-600"
            onClick={() =>
              setGaitEvents((p) => [...p, { type: "contact", frame: currentFrame, side: "R" }])
            }
          >
            CONTATO D
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[9px] bg-blue-500/10 font-black text-blue-600"
            onClick={() =>
              setGaitEvents((p) => [...p, { type: "contact", frame: currentFrame, side: "L" }])
            }
          >
            CONTATO E
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[9px] bg-red-500/10 font-black text-red-500"
            onClick={() =>
              setGaitEvents((p) => [...p, { type: "toe-off", frame: currentFrame, side: "R" }])
            }
          >
            IMPULSO D
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[9px] bg-purple-500/10 font-black text-purple-500"
            onClick={() =>
              setGaitEvents((p) => [...p, { type: "toe-off", frame: currentFrame, side: "L" }])
            }
          >
            IMPULSO E
          </Button>
        </div>
        {gaitEvents.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="w-full h-5 text-[9px] text-muted-foreground"
            onClick={() => setGaitEvents([])}
          >
            Limpar {gaitEvents.length} eventos
          </Button>
        )}

        {gaitMetrics &&
          (() => {
            const osc = oscillationZone(gaitMetrics.oscillationCm);
            const cad = cadenceZone(gaitMetrics.cadenceVal);
            return (
              <div className="space-y-2 pt-2 border-t border-green-500/10">
                {/* Cadência */}
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                      Cadência
                    </span>
                    <span className="text-[9px] text-muted-foreground">{cad.label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-black ${cad.color}`}>{gaitMetrics.cadence}</span>
                    <span className="text-[9px] font-bold text-muted-foreground ml-1">spm</span>
                  </div>
                </div>
                {/* Oscilação Vertical */}
                <div className={`p-2 rounded-lg ${osc.bg}`}>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                        Oscilação Vertical
                      </span>
                      <span className={`text-[9px] font-medium ${osc.color}`}>{osc.label}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-black ${osc.color}`}>
                        {gaitMetrics.oscillation}
                      </span>
                      <span className="text-[9px] font-bold text-muted-foreground ml-1">cm</span>
                    </div>
                  </div>
                </div>
                {/* Tempos brutos */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-1.5 bg-muted/10 rounded-lg">
                    <p className="text-sm font-black">
                      {gaitMetrics.tcMs}
                      <span className="text-[9px] ml-0.5">ms</span>
                    </p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold">
                      tc (Contato)
                    </p>
                  </div>
                  <div className="text-center p-1.5 bg-muted/10 rounded-lg">
                    <p className="text-sm font-black">
                      {gaitMetrics.tfMs}
                      <span className="text-[9px] ml-0.5">ms</span>
                    </p>
                    <p className="text-[8px] text-muted-foreground uppercase font-bold">tf (Voo)</p>
                  </div>
                </div>
                {/* Rigidez */}
                {gaitMetrics.legStiffness && gaitMetrics.kvert ? (
                  <div className="space-y-1 pt-1 border-t border-green-500/10">
                    <p className="text-[9px] font-black uppercase text-muted-foreground">
                      Rigidez · Sine-Wave
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-1.5 bg-muted/10 rounded-lg">
                        <p className="text-sm font-black text-primary">
                          {gaitMetrics.legStiffness}
                        </p>
                        <p className="text-[8px] text-muted-foreground uppercase font-bold">
                          kleg (kN/m)
                        </p>
                      </div>
                      <div className="text-center p-1.5 bg-muted/10 rounded-lg">
                        <p className="text-sm font-black text-primary">{gaitMetrics.kvert}</p>
                        <p className="text-[8px] text-muted-foreground uppercase font-bold">
                          kvert (kN/m)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[9px] text-amber-500 font-medium">
                    ↑ Informe massa + comp. perna para rigidez
                  </p>
                )}
              </div>
            );
          })()}
      </CardContent>
    </Card>
  );
};
