/**
 * EvolutionMultiView - Visualizacao multi-modo estilo Notion para historico de evolucoes
 *
 * Modos disponíveis:
 * - Timeline: linha do tempo cronologica (EvolutionTimeline existente)
 * - Galeria: grade de fotos das sessoes
 * - Grafo: grafo de conhecimento do paciente
 */

import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useMemo, useState } from "react";
import { parseISO, isValid, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Camera, Clock, GitBranch, Image, ZoomIn } from "lucide-react";
import { EvolutionTimeline } from "@/components/evolution/EvolutionTimeline";
import { PatientKnowledgeGraph } from "@/components/evolution/PatientKnowledgeGraph";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvolutionMultiViewProps {
  patientId: string;
  surgeries?: Array<{
    id: string;
    name: string;
    date: string;
    description?: string;
  }>;
  previousEvolutions?: Array<{
    id: string;
    patient_id: string;
    record_date?: string;
    date?: string;
    created_at: string;
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    pain_level?: number;
    attachments?: string[];
  }>;
  onCopyEvolution?: (evolution: unknown) => void;
  showComparison?: boolean;
  onToggleComparison?: () => void;
  goals?: Array<{
    id: string;
    goal_title: string;
    status: string;
    current_progress: number;
    priority: string;
  }>;
  pathologies?: Array<{
    id: string;
    pathology_name: string;
    status: string;
    severity?: string;
  }>;
}

type ViewMode = "timeline" | "galeria" | "grafo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extrai a data preferida de uma evolucao como objeto Date */
function resolveDate(
  evolution: EvolutionMultiViewProps["previousEvolutions"][number],
): Date | null {
  const raw = evolution.record_date ?? evolution.date ?? evolution.created_at;
  if (!raw) return null;
  try {
    const d = parseISO(raw);
    if (isValid(d)) return d;
    const fallback = new Date(raw);
    return isValid(fallback) ? fallback : null;
  } catch {
    return null;
  }
}

/** Retorna verdadeiro se a URL parece ser uma imagem */
function looksLikeImage(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const legacyStorageHost = ["fire", "basestorage"].join("");
  return (
    /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(lower) ||
    lower.includes(legacyStorageHost) ||
    lower.includes("storage.googleapis")
  );
}

// ---------------------------------------------------------------------------
// Sub-component: GalleryView
// ---------------------------------------------------------------------------

interface GalleryPhoto {
  url: string;
  evolutionId: string;
  evolutionDate: Date;
  sessionIndex: number;
}

interface GalleryViewProps {
  evolutions: EvolutionMultiViewProps["previousEvolutions"];
}

const GalleryView: React.FC<GalleryViewProps> = ({ evolutions }) => {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const photos = useMemo<GalleryPhoto[]>(() => {
    const result: GalleryPhoto[] = [];
    const sortedEvolutions = [...(evolutions ?? [])].sort((a, b) => {
      const da = resolveDate(a);
      const db_ = resolveDate(b);
      if (!da || !db_) return 0;
      return db_.getTime() - da.getTime();
    });

    sortedEvolutions.forEach((ev, idx) => {
      if (!ev.attachments?.length) return;
      const date = resolveDate(ev);
      if (!date) return;
      ev.attachments.forEach((url) => {
        if (looksLikeImage(url)) {
          result.push({
            url,
            evolutionId: ev.id,
            evolutionDate: date,
            sessionIndex: idx + 1,
          });
        }
      });
    });
    return result;
  }, [evolutions]);

  if (photos.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center min-h-[280px] text-muted-foreground"
      >
        <Camera className="h-14 w-14 mb-4 opacity-20" />
        <p className="text-base font-medium">Nenhuma foto encontrada</p>
        <p className="text-sm mt-1 opacity-90 text-center max-w-xs">
          Evolucao sem fotos — adicione imagens nas sessoes para visualizalas aqui
        </p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Grade de fotos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <motion.div
            key={`${photo.evolutionId}-${index}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.04, duration: 0.2 }}
            className="group relative aspect-square rounded-xl overflow-hidden bg-muted border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            onClick={() => setLightboxUrl(photo.url)}
          >
            <img
              src={photo.url}
              alt={`Sessao ${photo.sessionIndex} — ${format(photo.evolutionDate, "dd/MM/yyyy", { locale: ptBR })}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />

            {/* Overlay ao passar o mouse */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200 flex flex-col items-center justify-center gap-1">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity px-2 text-center leading-tight">
                {format(photo.evolutionDate, "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* Badge de sessao */}
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-black/40 text-white border-0"
              >
                Sessao {photo.sessionIndex}
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox simples */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxUrl}
                alt="Foto ampliada"
                className="w-full h-full object-contain rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-3 right-3 bg-black/60 text-white border-0 hover:bg-black/80"
                onClick={() => setLightboxUrl(null)}
              >
                Fechar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: GrafoView (placeholder)
// ---------------------------------------------------------------------------

interface GrafoViewProps {
  patientId: string;
  sessions: EvolutionMultiViewProps["previousEvolutions"];
  goals?: EvolutionMultiViewProps["goals"];
  pathologies?: EvolutionMultiViewProps["pathologies"];
}

const GrafoView: React.FC<GrafoViewProps> = ({
  patientId,
  sessions = [],
  goals = [],
  pathologies = [],
}) => {
  const graphSessions = sessions.map((ev, idx) => ({
    id: ev.id,
    date: ev.record_date ?? ev.date ?? ev.created_at,
    sessionNumber: sessions.length - idx,
    subjective: ev.subjective,
    painLevel: ev.pain_level,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="min-h-[520px]"
    >
      <PatientKnowledgeGraph
        patientId={patientId}
        sessions={graphSessions}
        goals={goals}
        pathologies={pathologies}
        className="rounded-xl border"
      />
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// View mode configuration
// ---------------------------------------------------------------------------

const VIEW_MODES: Array<{
  value: ViewMode;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { value: "timeline", label: "Timeline", icon: Clock },
  { value: "galeria", label: "Galeria", icon: Image },
  { value: "grafo", label: "Grafo", icon: GitBranch },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const EvolutionMultiView: React.FC<EvolutionMultiViewProps> = ({
  patientId,
  surgeries: _surgeries,
  previousEvolutions = [],
  onCopyEvolution,
  showComparison: _showComparison,
  onToggleComparison: _onToggleComparison,
  goals = [],
  pathologies = [],
}) => {
  const [activeView, setActiveView] = useState<ViewMode>("timeline");

  // Contagem de fotos para badge na aba Galeria
  const photoCount = useMemo(() => {
    let count = 0;
    for (const ev of previousEvolutions) {
      count += ev.attachments?.filter(looksLikeImage).length ?? 0;
    }
    return count;
  }, [previousEvolutions]);

  return (
    <div className="space-y-4">
      {/* ---- Seletor de Visualizacao (estilo Notion) ---- */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)}>
        <div className="flex items-center gap-2 flex-wrap">
          <TabsList className="h-9 gap-0.5 bg-muted/60 p-1">
            {VIEW_MODES.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all",
                  "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                {/* Badge de contagem para galeria */}
                {value === "galeria" && photoCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-[10px] leading-none ml-0.5"
                  >
                    {photoCount}
                  </Badge>
                )}
                {/* Badge de contagem para timeline */}
                {value === "timeline" && previousEvolutions.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="h-4 min-w-4 px-1 text-[10px] leading-none ml-0.5"
                  >
                    {previousEvolutions.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Info contextual */}
          <span className="text-xs text-muted-foreground ml-auto hidden md:block">
            {activeView === "timeline" && `${previousEvolutions.length} registros`}
            {activeView === "galeria" && `${photoCount} foto(s)`}
            {activeView === "grafo" && "Em desenvolvimento"}
          </span>
        </div>

        {/* ---- Conteúdo de cada aba ---- */}

        {/* Timeline */}
        <TabsContent value="timeline" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {patientId && (
                <EvolutionTimeline
                  patientId={patientId}
                  showFilters
                  onCopyEvolution={onCopyEvolution}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* Galeria */}
        <TabsContent value="galeria" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="galeria"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GalleryView evolutions={previousEvolutions} />
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* Grafo */}
        <TabsContent value="grafo" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="grafo"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GrafoView
                patientId={patientId}
                sessions={previousEvolutions}
                goals={goals}
                pathologies={pathologies}
              />
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export type { EvolutionMultiViewProps as EvolutionMultiViewPropsType };

