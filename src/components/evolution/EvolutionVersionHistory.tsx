/**
 * EvolutionVersionHistory
 *
 * Notion/Evernote-inspired version history panel for SOAP records.
 * Renders as a Sheet slide-over showing up to 25 saved snapshots with
 * one-click restore.
 *
 * Usage:
 *   <EvolutionVersionHistoryTrigger
 *     soapRecordId={currentSoapRecordId}
 *     onRestore={(content) => applySoapContent(content)}
 *   />
 */

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, RotateCcw, Clock, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEvolutionVersionHistory, type EvolutionVersion } from '@/hooks/evolution/useEvolutionVersionHistory';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvolutionVersionHistoryProps {
  soapRecordId?: string;
  onRestore: (content: EvolutionVersion['content']) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CHANGE_TYPE_CONFIG = {
  auto: {
    label: 'Auto',
    className: 'bg-muted text-muted-foreground border-border',
  },
  manual: {
    label: 'Manual',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800',
  },
  restore: {
    label: 'Restaurado',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  },
} as const;

function formatSavedAt(savedAt: string): { relative: string; absolute: string } {
  try {
    const date = new Date(savedAt);
    return {
      relative: formatDistanceToNow(date, { addSuffix: true, locale: ptBR }),
      absolute: format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
    };
  } catch {
    return { relative: savedAt, absolute: savedAt };
  }
}

function getContentPreview(content: EvolutionVersion['content']): string {
  const parts: string[] = [];
  if (content.subjective) parts.push(`S: ${content.subjective.slice(0, 80)}`);
  if (content.objective) parts.push(`O: ${content.objective.slice(0, 80)}`);
  if (content.assessment) parts.push(`A: ${content.assessment.slice(0, 80)}`);
  if (content.plan) parts.push(`P: ${content.plan.slice(0, 80)}`);
  if (content.evolution_notes) parts.push(content.evolution_notes.slice(0, 120));
  return parts.slice(0, 2).join(' · ') || '(sem conteúdo)';
}

// ---------------------------------------------------------------------------
// VersionCard
// ---------------------------------------------------------------------------

interface VersionCardProps {
  version: EvolutionVersion;
  index: number;
  onRestoreClick: (version: EvolutionVersion) => void;
}

function VersionCard({ version, index, onRestoreClick }: VersionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { relative, absolute } = formatSavedAt(version.savedAt);
  const config = CHANGE_TYPE_CONFIG[version.changeType] ?? CHANGE_TYPE_CONFIG.auto;
  const preview = getContentPreview(version.content);
  const isLatest = index === 0;

  const soapFields = [
    { label: 'Subjetivo', value: version.content.subjective },
    { label: 'Objetivo', value: version.content.objective },
    { label: 'Avaliação', value: version.content.assessment },
    { label: 'Plano', value: version.content.plan },
    { label: 'Evolução', value: version.content.evolution_notes },
  ].filter((f) => f.value);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        isLatest
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-card hover:bg-muted/30'
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" title={absolute}>
              {relative}
            </p>
            <p className="text-xs text-muted-foreground">{absolute}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLatest && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30 font-bold">
              Atual
            </Badge>
          )}
          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.className)}>
            {config.label}
          </Badge>
        </div>
      </div>

      {/* Preview text */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{preview}</p>

      {/* Expand / collapse SOAP fields */}
      {soapFields.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 pt-1">
                  {soapFields.map((field) => (
                    <div key={field.label} className="rounded-md bg-muted/50 px-2.5 py-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
                        {field.label}
                      </p>
                      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
                        {field.value}
                      </p>
                    </div>
                  ))}
                  {version.content.pain_level !== undefined && (
                    <div className="rounded-md bg-muted/50 px-2.5 py-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">
                        Dor
                      </p>
                      <p className="text-xs text-foreground/80">{version.content.pain_level}/10</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Restore button */}
      {!isLatest && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs font-semibold border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
          onClick={() => onRestoreClick(version)}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar esta versão
        </Button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component (Sheet trigger + content)
// ---------------------------------------------------------------------------

export function EvolutionVersionHistoryTrigger({ soapRecordId, onRestore }: EvolutionVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [confirmVersion, setConfirmVersion] = useState<EvolutionVersion | null>(null);
  const { versions, isLoading, saveVersion, isSaving } = useEvolutionVersionHistory(soapRecordId);
  const { toast } = useToast();

  const handleRestoreClick = (version: EvolutionVersion) => {
    setConfirmVersion(version);
  };

  const handleConfirmRestore = async () => {
    if (!confirmVersion) return;
    // Save a 'restore' snapshot before overwriting so the user can undo
    await saveVersion({ content: confirmVersion.content, changeType: 'restore' });
    onRestore(confirmVersion.content);
    setConfirmVersion(null);
    setOpen(false);
    toast({
      title: 'Versão restaurada',
      description: 'O conteúdo foi restaurado com sucesso. A versão anterior foi salva como backup.',
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            disabled={!soapRecordId}
            title={soapRecordId ? 'Histórico de versões' : 'Salve a evolução para ver o histórico'}
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
            {versions.length > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] font-black">
                {versions.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Histórico de versões
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {versions.length > 0
                ? `${versions.length} versão${versions.length > 1 ? 'ões' : ''} salva${versions.length > 1 ? 's' : ''} · máx 25`
                : 'Nenhuma versão salva ainda'}
            </p>
          </SheetHeader>

          <ScrollArea className="flex-1 px-4">
            <div className="py-4 space-y-3">
              {isLoading && (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Carregando versões...</span>
                </div>
              )}

              {!isLoading && versions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Nenhuma versão ainda</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      As versões são salvas automaticamente ao gravar a evolução.
                    </p>
                  </div>
                </div>
              )}

              {!isLoading && versions.length > 0 && (
                <>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Restaurar substitui o conteúdo atual. Um backup será criado automaticamente.
                  </div>
                  <Separator className="mb-3" />
                  {versions.map((version, index) => (
                    <VersionCard
                      key={version.id}
                      version={version}
                      index={index}
                      onRestoreClick={handleRestoreClick}
                    />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          {isSaving && (
            <div className="px-4 py-2 border-t flex items-center gap-2 text-xs text-muted-foreground bg-muted/30">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Salvando backup...
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm restore dialog */}
      <AlertDialog open={!!confirmVersion} onOpenChange={(o) => { if (!o) setConfirmVersion(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
            <AlertDialogDescription>
              O conteúdo atual será substituído pela versão de{' '}
              <strong>
                {confirmVersion ? formatSavedAt(confirmVersion.savedAt).absolute : ''}
              </strong>
              . Um backup da versão atual será criado automaticamente antes da restauração.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRestore} className="bg-primary text-primary-foreground">
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
