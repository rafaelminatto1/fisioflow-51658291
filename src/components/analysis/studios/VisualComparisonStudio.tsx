import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { biomechanicsApi, BiomechanicsAssessment } from "@/api/v2/biomechanics";
import { BiomechanicsComparison } from "../BiomechanicsComparison";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  ArrowLeftRight, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  TrendingUp,
  X
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

interface VisualComparisonStudioProps {
  patientId?: string;
  onDataUpdate?: (data: any) => void;
}

export const VisualComparisonStudio: React.FC<VisualComparisonStudioProps> = ({
  patientId,
  onDataUpdate,
}) => {
  const [assessments, setAssessments] = useState<BiomechanicsAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadHistory();
    }
  }, [patientId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await biomechanicsApi.listByPatient(patientId!);
      setAssessments(res.data || []);
    } catch (error) {
      console.error("Failed to load biomechanics history", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const baseAssessment = assessments.find((a) => a.id === selectedIds[0]);
  const compareAssessment = assessments.find((a) => a.id === selectedIds[1]);

  if (isLoading) return <LoadingSkeleton type="card" rows={3} />;

  if (assessments.length < 2) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-primary/10 mb-4">
            <History className="h-8 w-8 text-primary/40" />
          </div>
          <h3 className="font-bold text-lg">Histórico Insuficiente</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            É necessário ter pelo menos duas análises biomecânicas salvas para realizar uma comparação evolutiva.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!showComparison ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Selecione as Análises para Comparação
                </h3>
                <p className="text-sm text-muted-foreground">
                  Selecione até 2 registros do histórico para visualizar a evolução lado a lado.
                </p>
              </div>
              <Button
                disabled={selectedIds.length !== 2}
                onClick={() => setShowComparison(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-black rounded-xl"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Comparar Agora
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assessments.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const selectionIndex = selectedIds.indexOf(item.id) + 1;

                return (
                  <Card
                    key={item.id}
                    className={`cursor-pointer overflow-hidden transition-all relative border-2 ${
                      isSelected ? "border-primary bg-primary/5 ring-4 ring-primary/10" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    onClick={() => toggleSelection(item.id)}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-primary text-white h-6 w-6 rounded-full flex items-center justify-center p-0 font-black">
                          {selectionIndex}
                        </Badge>
                      </div>
                    )}
                    <div className="aspect-video bg-black relative">
                      <img
                        src={item.thumbnailUrl || item.mediaUrl}
                        alt="Thumbnail"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.createdAt), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-bold truncate">
                        {item.type.replace("_", " ").toUpperCase()}
                      </p>
                      <div className="flex gap-1 mt-1">
                        {Object.keys(item.analysisData.angles || {}).slice(0, 2).map(k => (
                          <Badge key={k} variant="secondary" className="text-[9px] px-1.5 py-0">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComparison(false)}
                className="gap-2 hover:bg-muted"
              >
                <X className="h-4 w-4" />
                Voltar para seleção
              </Button>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Visão Comparativa Pro
                </Badge>
              </div>
            </div>

            {baseAssessment && compareAssessment && (
              <BiomechanicsComparison
                baseAssessment={baseAssessment}
                compareAssessment={compareAssessment}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
