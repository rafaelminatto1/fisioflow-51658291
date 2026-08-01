import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PainMapCanvas } from "./PainMapCanvas";
import { PainEvolutionChart } from "@/components/pain-map/PainEvolutionChart";
import { PainMapHistory } from "./PainMapHistory";
import { PainGauge } from "@/components/pain-map/PainGauge";
import { EvaScaleBar } from "@/components/pain-map/EvaScaleBar";
import { PainPointsList } from "@/components/pain-map/PainPointsList";
import { PainPointDetailPanel } from "@/components/pain-map/PainPointDetailPanel";
import { PainMapService } from "@/lib/services/painMapService";
import {
  usePainMaps,
  usePainEvolution,
  usePainStatistics,
  useCreatePainMap,
  useUpdatePainMap,
} from "@/hooks/usePainMaps";
import { useAuth } from "@/contexts/AuthContext";
import type { PainMapPoint, PainIntensity, BodyRegion, PainType } from "@/types/painMap";
import type { PainPoint } from "@/components/pain-map/BodyMap";
import { TrendingDown, TrendingUp, Minus, CheckCircle2, Loader2, X, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fisioLogger as logger } from "@/lib/errors/logger";

interface PainMapManagerProps {
  patientId: string;
  sessionId?: string;
  appointmentId?: string;
  readOnly?: boolean;
}

export function PainMapManager({
  patientId,
  sessionId,
  _appointmentId,
  readOnly = false,
}: PainMapManagerProps) {
  const [painPoints, setPainPoints] = useState<PainMapPoint[]>([]);
  const [chartType, setChartType] = useState<"line" | "area" | "bar">("line");
  const [is3DMode, setIs3DMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null);
  const { user } = useAuth();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>("");

  const { patientMaps: painMaps = [], isLoading } = usePainMaps({ patientId });
  const { data: painEvolution = [] } = usePainEvolution(patientId);
  const { data: stats } = usePainStatistics(patientId);
  const createPainMap = useCreatePainMap();

  const _updatePainMap = useUpdatePainMap();

  const [selectedPointForDetail, setSelectedPointForDetail] = useState<PainPoint | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<PainIntensity>(5);

  const globalPainLevel =
    painPoints.length > 0
      ? (Math.round(
          painPoints.reduce((sum, p) => sum + p.intensity, 0) / painPoints.length,
        ) as PainIntensity)
      : 0;

  // Auto-save function
  const autoSave = useCallback(async () => {
    if (!user || painPoints.length === 0 || readOnly || !sessionId) return;

    const currentData = JSON.stringify(painPoints);
    if (currentData === lastSavedRef.current) return;

    setSaveStatus("saving");

    const bodyMapPoints: Omit<import("@/components/pain-map/BodyMap").PainPoint, "id">[] =
      painPoints.map((p) => ({
        regionCode: p.region,
        region: p.region,
        intensity: p.intensity,
        painType: p.painType as PainPoint["painType"],
        notes: p.description,
        x: p.x,
        y: p.y,
      }));

    try {
      await createPainMap.mutateAsync({
        sessionId,
        view: "front",
        points: bodyMapPoints,
      });
      lastSavedRef.current = currentData;
      setSaveStatus("saved");

      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      logger.error("Erro ao salvar mapa de dor", error, "PainMapManager");
      setSaveStatus("error");
    }
  }, [user, painPoints, sessionId, createPainMap, readOnly]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (painPoints.length === 0 || readOnly) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [painPoints, autoSave, readOnly]);

  const getTrendIcon = () => {
    if (!stats) return <Minus className="w-4 h-4" />;

    switch (stats.improvementTrend) {
      case "improving":
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      case "worsening":
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getTrendLabel = () => {
    if (!stats) return "Sem dados";

    switch (stats.improvementTrend) {
      case "improving":
        return "Melhorando";
      case "worsening":
        return "Piorando";
      default:
        return "Estável";
    }
  };

  const convertToBodyMapPoint = useCallback((point: PainMapPoint): PainPoint => {
    return {
      id: `point-${point.x}-${point.y}`,
      regionCode: point.region,
      region: point.region,
      intensity: point.intensity,
      painType: point.painType as PainPoint["painType"],
      notes: point.description,
      x: point.x,
      y: point.y,
    };
  }, []);

  const handlePointUpdate = useCallback(
    (point: PainPoint) => {
      const updatedPoint: PainMapPoint = {
        region: point.region as PainMapPoint["region"],
        intensity: Math.min(10, Math.max(0, point.intensity)) as PainIntensity,
        painType: point.painType as PainMapPoint["painType"],
        description: point.notes,
        x: point.x,
        y: point.y,
      };

      setPainPoints((prev) => {
        const index = prev.findIndex((p) => p.x === point.x && p.y === point.y);
        if (index >= 0) {
          const newPoints = [...prev];
          newPoints[index] = updatedPoint;
          return newPoints;
        }
        return prev;
      });

      if (selectedPointForDetail?.id === point.id) {
        setSelectedPointForDetail(point);
      }
    },
    [selectedPointForDetail],
  );

  const handlePointRemove = useCallback(
    (pointId: string) => {
      setPainPoints((prev) => prev.filter((p) => `point-${p.x}-${p.y}` !== pointId));
      if (selectedPointForDetail?.id === pointId) {
        setSelectedPointForDetail(null);
      }
    },
    [selectedPointForDetail],
  );

  const handlePainUpdateForRegion = (
    region: BodyRegion,
    intensity: PainIntensity,
    painType: PainType,
    description?: string,
  ) => {
    const existing = painPoints.find((p) => p.region === region);
    const newPoint: PainMapPoint = {
      region,
      intensity,
      painType,
      description,
      x: existing?.x ?? 50,
      y: existing?.y ?? 50,
    };

    const updated = painPoints.filter((p) => p.region !== region);
    if (intensity > 0) {
      updated.push(newPoint);
    }
    setPainPoints(updated);
  };

  const handleRemoveRegionPoint = (region: BodyRegion) => {
    setPainPoints((prev) => prev.filter((p) => p.region !== region));
    setSelectedRegion(null);
  };

  const bodyMapPoints: PainPoint[] = painPoints.map(convertToBodyMapPoint);
  const selectedPoint = selectedRegion ? painPoints.find((p) => p.region === selectedRegion) : null;

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return "#9ca3af";
    if (intensity <= 2) return "#22c55e";
    if (intensity <= 4) return "#84cc16";
    if (intensity <= 6) return "#eab308";
    if (intensity <= 8) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      {stats && painMaps.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Dor Média</p>
              <p className="text-2xl font-bold">{stats.averagePainLevel.toFixed(1)}/10</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Redução</p>
              <p className="text-2xl font-bold text-green-600">
                -{stats.painReduction.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Tendência</p>
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className="text-lg font-semibold">{getTrendLabel()}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Registros</p>
              <p className="text-2xl font-bold">{painMaps.length}</p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl p-1 bg-muted/60">
          <TabsTrigger value="current" className="rounded-lg font-medium">Mapa Atual</TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-lg font-medium">Evolução</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-medium">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-6">
          <div className="flex justify-end mb-2">
            <div className="flex items-center space-x-2 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
              <Label htmlFor="3d-mode" className="text-sm font-medium cursor-pointer">
                Modo 3D Realista
              </Label>
              <Switch id="3d-mode" checked={is3DMode} onCheckedChange={setIs3DMode} />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Left Column (60%): Body Map Canvas */}
            <div className={is3DMode ? "w-full" : "w-full lg:w-7/12"}>
              <PainMapCanvas
                painPoints={painPoints}
                onPainPointsChange={setPainPoints}
                readOnly={readOnly}
                variant={is3DMode ? "3d" : "2d"}
                evolutionData={painEvolution}
                selectedRegion={selectedRegion}
                onRegionSelect={setSelectedRegion}
              />
            </div>

            {/* Right Column (40%): Pain Control & Editor Dashboard */}
            {!is3DMode && (
              <Card className="w-full lg:w-5/12 p-6 flex flex-col justify-between gap-6 border shadow-sm rounded-2xl bg-card">
                <div className="space-y-6">
                  {/* Global Pain Level Gauge */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nível Global</p>
                      <p className="text-lg font-bold text-foreground">
                        {globalPainLevel === 0 ? "Sem Dor" : `Média: ${globalPainLevel}/10`}
                      </p>
                    </div>
                    <PainGauge score={globalPainLevel * 10} intensity={globalPainLevel} size="sm" />
                  </div>

                  {/* EVA Scale Slider */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground block mb-2">Escala Visual Analógica (EVA)</Label>
                    <EvaScaleBar
                      value={selectedIntensity}
                      onChange={(v) => setSelectedIntensity(v as PainIntensity)}
                      disabled={readOnly}
                    />
                  </div>

                  {/* Dynamic Pain Editor Panel for Selected Region */}
                  <div className="pt-4 border-t border-border/60">
                    {selectedRegion ? (
                      <div className="space-y-4 animate-fade-in p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center justify-between">
                          <Badge variant="default" className="text-xs px-2.5 py-1 font-semibold">
                            {PainMapService.getRegionLabel(selectedRegion)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedRegion(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="intensity-select" className="text-xs font-medium">Intensidade (0 a 10)</Label>
                          <Select
                            value={selectedPoint?.intensity?.toString() || "0"}
                            onValueChange={(v) =>
                              handlePainUpdateForRegion(
                                selectedRegion,
                                parseInt(v) as PainIntensity,
                                selectedPoint?.painType || "aguda",
                                selectedPoint?.description,
                              )
                            }
                            disabled={readOnly}
                          >
                            <SelectTrigger id="intensity-select" className="h-9 text-xs">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                <SelectItem key={n} value={n.toString()} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full shrink-0"
                                      style={{ backgroundColor: getIntensityColor(n) }}
                                    />
                                    <span>
                                      {n} -{" "}
                                      {n === 0
                                        ? "Sem dor"
                                        : n <= 2
                                          ? "Mínima"
                                          : n <= 4
                                            ? "Leve"
                                            : n <= 6
                                              ? "Moderada"
                                              : n <= 8
                                                ? "Intensa"
                                                : "Severa"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="pain-type-select" className="text-xs font-medium">Tipo de Dor</Label>
                          <Select
                            value={selectedPoint?.painType || "aguda"}
                            onValueChange={(v) =>
                              handlePainUpdateForRegion(
                                selectedRegion,
                                selectedPoint?.intensity || 5,
                                v as PainType,
                                selectedPoint?.description,
                              )
                            }
                            disabled={readOnly}
                          >
                            <SelectTrigger id="pain-type-select" className="h-9 text-xs">
                              <SelectValue placeholder="Tipo de dor..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aguda" className="text-xs">🔥 Aguda</SelectItem>
                              <SelectItem value="cronica" className="text-xs">⏳ Crônica</SelectItem>
                              <SelectItem value="latejante" className="text-xs">💓 Latejante</SelectItem>
                              <SelectItem value="queimacao" className="text-xs">🌡️ Queimação</SelectItem>
                              <SelectItem value="formigamento" className="text-xs">⚡ Formigamento</SelectItem>
                              <SelectItem value="dormencia" className="text-xs">😶 Dormência</SelectItem>
                              <SelectItem value="peso" className="text-xs">🏋️ Peso</SelectItem>
                              <SelectItem value="pontada" className="text-xs">📌 Pontada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="region-notes" className="text-xs font-medium">Observações</Label>
                          <Textarea
                            id="region-notes"
                            value={selectedPoint?.description || ""}
                            onChange={(e) =>
                              handlePainUpdateForRegion(
                                selectedRegion,
                                selectedPoint?.intensity || 5,
                                selectedPoint?.painType || "aguda",
                                e.target.value,
                              )
                            }
                            placeholder="Descreva gatilhos, irradiação ou fatores de melhora..."
                            rows={2}
                            disabled={readOnly}
                            className="text-xs resize-none"
                          />
                        </div>

                        {selectedPoint && !readOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRegionPoint(selectedRegion)}
                            className="w-full h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            Remover dor desta região
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/20 border border-dashed rounded-xl text-center flex flex-col items-center justify-center min-h-[140px]">
                        <MapPin className="w-6 h-6 text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-medium text-foreground">Edição de Ponto</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Clique em qualquer região da silhueta corporal para registrar ou alterar a dor.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Registered Points List */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Pontos Registrados ({painPoints.length})
                      </p>
                      {painPoints.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          Ativos
                        </Badge>
                      )}
                    </div>
                    <PainPointsList
                      points={bodyMapPoints}
                      onPointEdit={(point) => setSelectedRegion(point.regionCode as BodyRegion)}
                      onPointRemove={handlePointRemove}
                      className="max-h-[220px]"
                    />
                  </div>
                </div>

                {/* Auto-save status footer */}
                {!readOnly && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {saveStatus === "saving" && (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span className="font-medium text-foreground">Salvando...</span>
                        </>
                      )}
                      {saveStatus === "saved" && (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600 font-medium">Salvo automaticamente</span>
                        </>
                      )}
                      {saveStatus === "error" && (
                        <>
                          <TrendingUp className="w-3.5 h-3.5 text-red-600 rotate-45" />
                          <span className="text-red-600 font-medium">Erro ao salvar</span>
                        </>
                      )}
                      {saveStatus === "idle" && painPoints.length > 0 && (
                        <span className="text-[11px]">Auto-save ativo</span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="evolution" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Select
              value={chartType}
              onValueChange={(v: "line" | "area" | "bar") => setChartType(v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Linha</SelectItem>
                <SelectItem value="area">Área</SelectItem>
                <SelectItem value="bar">Barras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PainEvolutionChart evolutionData={painEvolution} showStats={true} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <PainMapHistory painMaps={painMaps} isLoading={isLoading} />
        </TabsContent>
      </Tabs>

      {/* Detail panel modal fallback if needed */}
      {selectedPointForDetail && (
        <div className="fixed right-4 top-20 z-50 w-96 max-w-[calc(100vw-2rem)]">
          <PainPointDetailPanel
            point={selectedPointForDetail}
            onUpdate={handlePointUpdate}
            onDelete={handlePointRemove}
            onClose={() => setSelectedPointForDetail(null)}
          />
        </div>
      )}
    </div>
  );
}
