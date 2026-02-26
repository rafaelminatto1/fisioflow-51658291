/**
 * NotionEvolutionPanel V3 - Full-page Notion-style evolution editor
 *
 * Phase 1-5 Features Integrated:
 * - Global keyboard shortcuts
 * - Section completion animations
 * - Typing pulse effect
 * - High contrast mode
 * - Quick pain slider
 * - SOAP templates
 * - Exercise quick add
 * - Compact view mode
 * - Contextual section emphasis
 * - Missing alerts
 * - Swipe gestures
 * - Voice dictation
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  CheckSquare,
  Wand2,
  Sparkles,
  Paperclip,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RichTextProvider, useRichTextContext } from '@/context/RichTextContext';
import { RichTextToolbar } from '@/components/ui/RichTextToolbar';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { uploadFile } from '@/lib/firebase/storage';
import type { Exercise } from './ExerciseQuickAdd';
import type { EvolutionV2Data } from '../v2-improved/types';
import { QuickPainSlider } from './QuickPainSlider';
import { TemplateSelector, type SOAPTemplate } from './TemplateSelector';
import { OfflineStatusIndicator } from '@/hooks/useOfflineSync';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { generatePatientSummary } from '@/lib/genkit/patient-summary';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface NotionEvolutionPanelProps {
  data: EvolutionV2Data;
  onChange: (data: EvolutionV2Data) => void;
  onSave?: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  autoSaveEnabled?: boolean;
  lastSaved?: Date | null;
  className?: string;
  onTemplateSelect?: (template: SOAPTemplate) => void;
  onTemplateCreate?: () => void;
  onTemplateManage?: () => void;
  customTemplates?: SOAPTemplate[];
  showQuickPainSlider?: boolean;
  showQuickExerciseAdd?: boolean;
  exerciseLibrary?: Exercise[];
  pathology?: string;
  onAutoSave?: (data: EvolutionV2Data) => Promise<void> | void;
  patientId?: string;
  evolutionId?: string;
}

const NotionEvolutionPanel: React.FC<NotionEvolutionPanelProps> = ({
  data,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  autoSaveEnabled,
  className,
  onTemplateSelect,
  onTemplateCreate,
  onTemplateManage,
  customTemplates,
  showQuickPainSlider = true,
  onAutoSave,
  patientId,
  evolutionId,
}) => {
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const navigate = useNavigate();
  const [localSaveStatus, setLocalSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [localLastSaved, setLocalLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastPayloadRef = useRef<string>('');
  const resolvedAutoSaveEnabled = autoSaveEnabled ?? true;
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const { activeEditor } = useRichTextContext();

  const statusTags = ['Dor aguda', 'Reabilitação', 'Alta próxima'] as const;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const defaultChecklist = [
    { id: 'soap', label: 'SOAP preenchido', done: false },
    { id: 'dor', label: 'Escala de dor registrada', done: false },
    { id: 'exercicios', label: 'Exercícios registrados', done: false },
    { id: 'assinatura', label: 'Revisão e assinatura', done: false },
  ];
  const checklistKey = `evolution_session_checklist_${patientId || 'local'}_${data.sessionDate || 'current'}`;
  const [checklist, setChecklist] = useState(defaultChecklist);

  const patientReportCount = useMemo(() => (data.patientReport || '').replace(/<[^>]+>/g, '').length, [data.patientReport]);
  const evolutionTextCount = useMemo(() => (data.evolutionText || '').replace(/<[^>]+>/g, '').length, [data.evolutionText]);
  const safeEvolutionId = useMemo(() => {
    const rawEvolutionId = evolutionId || `sessao-${data.sessionNumber || 'draft'}-${data.sessionDate || 'agora'}`;
    return rawEvolutionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }, [evolutionId, data.sessionNumber, data.sessionDate]);

  const localSaveLabel = useMemo(() => {
    if (!resolvedAutoSaveEnabled) return 'Auto-salvar desativado';
    if (localSaveStatus === 'saving') return 'Salvando...';
    if (localSaveStatus === 'error') return 'Falha ao salvar';
    if (localSaveStatus === 'saved' && localLastSaved) {
      return `Auto-salvo às ${localLastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return 'Auto-salvar ativo';
  }, [resolvedAutoSaveEnabled, localSaveStatus, localLastSaved]);

  useEffect(() => {
    if (!resolvedAutoSaveEnabled || disabled) return;

    const payload = JSON.stringify({
      patientReport: data.patientReport || '',
      evolutionText: data.evolutionText || '',
      homeCareExercises: data.homeCareExercises || '',
      painLevel: data.painLevel ?? 0,
      painLocation: data.painLocation || '',
      sessionNumber: data.sessionNumber || 0,
      sessionDate: data.sessionDate || '',
    });

    if (payload === lastPayloadRef.current) return;
    lastPayloadRef.current = payload;

    if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    setLocalSaveStatus('saving');

    autoSaveTimerRef.current = window.setTimeout(() => {
      Promise.resolve(onAutoSave?.(data))
        .then(() => {
          setLocalLastSaved(new Date());
          setLocalSaveStatus('saved');
        })
        .catch(() => {
          setLocalSaveStatus('error');
        });
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) window.clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    resolvedAutoSaveEnabled,
    disabled,
    data.patientReport,
    data.evolutionText,
    data.homeCareExercises,
    data.painLevel,
    data.painLocation,
    data.sessionNumber,
    data.sessionDate,
    onAutoSave,
  ]);

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const summary = await generatePatientSummary({
        patientName: 'Paciente',
        condition: 'Em tratamento',
        history: [],
        goals: [],
      });
      setAiSummary(summary);
      toast.success('Resumo gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar resumo.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  useGlobalShortcuts({
    enabled: !disabled,
    onSave,
    onShowShortcuts: () => setShowShortcutsModal(true),
  });

  const handleFieldChange = useCallback(
    <K extends keyof EvolutionV2Data>(field: K, value: EvolutionV2Data[K]) => {
      onChange({ ...data, [field]: value });
    },
    [data, onChange]
  );

  useEffect(() => {
    const raw = localStorage.getItem(checklistKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as typeof defaultChecklist;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setChecklist(parsed);
      }
    } catch (error) {
      // ignore
    }
  }, [checklistKey]);

  useEffect(() => {
    localStorage.setItem(checklistKey, JSON.stringify(checklist));
  }, [checklist, checklistKey]);

  const checklistProgress = useMemo(() => {
    const total = checklist.length;
    const done = checklist.filter((item) => item.done).length;
    return total ? Math.round((done / total) * 100) : 0;
  }, [checklist]);

  const summaryStats = useMemo(() => {
    const html = `${data.patientReport || ''} ${data.evolutionText || ''}`;
    const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
    const stopwords = new Set([
      'a', 'o', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'em', 'para', 'por', 'com', 'sem', 'que', 'um', 'uma', 'no', 'na', 'nos', 'nas',
      'e', 'ou', 'se', 'ao', 'à', 'às', 'mais', 'menos', 'como', 'foi', 'é', 'está', 'esta', 'estao', 'estão', 'sua', 'seu',
    ]);
    const words = text.split(/[^a-zà-ú0-9]+/i).filter((w) => w.length > 3 && !stopwords.has(w));
    const freq = new Map<string, number>();
    words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
    const keywords = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);

    const sessionDate = data.sessionDate ? new Date(data.sessionDate) : null;
    const now = new Date();
    let timeSince = '—';
    if (sessionDate) {
      const diffMs = now.getTime() - sessionDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffDays > 0) timeSince = `${diffDays} dia(s)`;
      else if (diffHours > 0) timeSince = `${diffHours} hora(s)`;
      else timeSince = 'agora';
    }

    return {
      keywords,
      timeSince,
    };
  }, [data.patientReport, data.evolutionText, data.sessionDate]);
  const painLevel = data.painLevel ?? 0;

  useEffect(() => {
    // Make user profile available for signature command
    if (data.therapistName) {
      (window as any).__USER_PROFILE = { 
        full_name: data.therapistName, 
        crefito: data.therapistCrefito || '—' 
      };
    }
  }, [data.therapistName, data.therapistCrefito]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleQuickUpload = async (file: File, type: 'attachment' | 'scan') => {
    if (!patientId) {
      toast.error('Não foi possível identificar o paciente para salvar o arquivo.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const folder = isImage
      ? `patients/${patientId}/evolutions/${safeEvolutionId}`
      : `patients/${patientId}/documents/${safeEvolutionId}`;
    const loadingToast = toast.loading('Enviando arquivo...');
    try {
      const result = await uploadFile(file, {
        folder,
        contentType: file.type,
        resumable: true,
        includeUserIdPath: false,
        metadata: {
          source: type,
          originalName: file.name,
        },
      });
      if (isImage) {
        activeEditor?.chain().focus().setImage({ src: result.url }).run();
      } else {
        const linkHtml = `<p><a href="${result.url}" target="_blank" rel="noopener noreferrer">Anexo: ${file.name}</a></p>`;
        activeEditor?.chain().focus().insertContent(linkHtml).run();
      }
      toast.success('Arquivo inserido.', { id: loadingToast });
    } catch (error) {
      toast.error('Erro ao enviar arquivo.', { id: loadingToast });
    }
  };

  const toEditorHtml = useCallback((value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;

    const escapeHtml = (text: string) =>
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return trimmed
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }, []);

  const handleTemplateSelect = useCallback(
    (template: SOAPTemplate) => {
      if (import.meta.env.DEV) {
        console.debug('[NotionEvolutionPanel] Applying template', template.id, template.name);
      }
      onTemplateSelect?.(template);
      onChange({
        ...data,
        patientReport: toEditorHtml(template.subjective),
        evolutionText: toEditorHtml(`${template.objective}\n\n${template.assessment}\n\n${template.plan}`),
      });
    },
    [onTemplateSelect, onChange, data, toEditorHtml]
  );

  return (
    <div className={cn('flex-1 flex flex-col h-full overflow-hidden relative bg-white', className)}>
      {/* Top Bar / Breadcrumbs */}
      <header className="px-6 pt-8 pb-4 flex-shrink-0 flex justify-between items-center">
        <div className="text-sm text-notion-gray">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="hover:text-foreground transition-colors"
          >
            FisioFlow
          </button>
          <span className="mx-1">&gt;</span>
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="hover:text-foreground transition-colors"
          >
            Pacientes
          </button>
          <span className="mx-1">&gt;</span>
          <span>Evolução</span>
          <span className="mx-1">&gt;</span>{' '}
          <span className="text-black font-medium">
            {data.sessionDate ? new Date(data.sessionDate).toLocaleDateString('pt-BR') : 'Nova Sessão'} - Sessão #{data.sessionNumber || 1}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col text-[11px] text-muted-foreground leading-tight mr-2" role="status" aria-live="polite">
            <span>{localSaveLabel}</span>
            {isSaving && <span className="text-primary/80">Salvando no servidor...</span>}
          </div>
          <input
            ref={attachmentInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) handleQuickUpload(file, 'attachment');
              e.currentTarget.value = '';
            }}
          />
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              if (file) handleQuickUpload(file, 'scan');
              e.currentTarget.value = '';
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => attachmentInputRef.current?.click()}
            className="gap-2"
            title="Anexar PDF"
          >
            <Paperclip className="h-4 w-4" />
            <span className="hidden sm:inline">Anexar</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scanInputRef.current?.click()}
            className="gap-2"
            title="Scanner de imagem"
          >
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">Scanner</span>
          </Button>
          <OfflineStatusIndicator />
          <TemplateSelector
            onSelect={handleTemplateSelect}
            onCreate={onTemplateCreate}
            onManage={onTemplateManage}
            customTemplates={customTemplates}
            disabled={disabled}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary || disabled}
            className="gap-2 text-primary hover:bg-primary/5"
            title="Gerar resumo clínico com IA"
          >
            {isGeneratingSummary ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">IA</span>
          </Button>
        </div>
      </header>

      {/* Content Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32">
        <div className="sticky top-0 z-30 bg-white border-b border-[#E9E9E8]">
          <RichTextToolbar
            className="border-t border-transparent"
            imageUploadFolder={patientId ? `patients/${patientId}/evolutions/${safeEvolutionId}` : undefined}
          />
        </div>
        <div className="mx-auto mt-12 w-full max-w-[1280px] px-2 lg:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,860px)_300px] gap-8 items-start">
            <div className="min-w-0 pl-6 pr-2">

              {/* H1 Header: Patient Evolution */}
              <div className="flex items-baseline mb-12 group gap-4">
                <div className="w-8 flex-shrink-0 text-right text-sm font-medium text-[#D3D1CB] select-none">H1</div>
                <div className="flex-1">
                  <h1 className="font-bold text-[#37352f] leading-tight text-4xl tracking-tight">Evolução Clínica</h1>
                  <p className="text-xs text-muted-foreground mt-2">Use “/” para inserir blocos, tabelas, callouts e mídias.</p>
                </div>
              </div>

              {/* Mobile summary / checklist */}
              <div className="lg:hidden space-y-4 mb-10 ml-12">
                <div className="p-4 rounded-xl border border-[#ECEBEA] bg-[#FBFBFA]">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Última edição: {localLastSaved ? localLastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    <span>Tempo desde a sessão: {summaryStats.timeSince}</span>
                    <span>Palavras‑chave: {summaryStats.keywords.length ? summaryStats.keywords.join(', ') : '—'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#ECEBEA] bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#37352f]">Checklist da Sessão</h3>
                    <span className="text-xs text-muted-foreground">{checklistProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary transition-all" style={{ width: `${checklistProgress}%` }} />
                  </div>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-sm text-[#37352f]">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            setChecklist((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
                            )
                          }
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI Summary Display */}
              {aiSummary && (
                <div className="mb-12 ml-12 animate-in fade-in slide-in-from-top-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-primary mb-1">Resumo Inteligente</h3>
                        <p className="text-sm text-foreground/80 leading-relaxed">{aiSummary.summary}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="h-px bg-[#ECEBEA] mb-10 ml-12" />

              {/* H2 Header: Pain Level */}
              {showQuickPainSlider && (
                <div id="pain-section" className="flex items-baseline mb-12 group gap-4 scroll-mt-28">
                  <div className="w-8 flex-shrink-0 text-right text-sm font-medium text-[#D3D1CB] select-none">H2</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-semibold text-[#37352f] mb-6">Nível de Dor (EVA)</h2>
                    <QuickPainSlider
                      value={data.painLevel}
                      onChange={(level) => handleFieldChange('painLevel', level)}
                      disabled={disabled}
                      showLabel
                    />
                  </div>
                </div>
              )}

              <div className="h-px bg-[#ECEBEA] mb-8 ml-12" />

              {/* H2 Header: Evolution Text */}
              <div id="evolutionText" className="flex items-baseline mb-8 group gap-4">
                <div className="w-8 flex-shrink-0 text-right text-sm font-medium text-[#D3D1CB] select-none">H2</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-[#37352f] mb-2 hover:text-[#2383e2] cursor-text transition-colors">Evolução Clínica</h2>
                    <span className="text-xs text-muted-foreground">{evolutionTextCount} caracteres</span>
                  </div>
                  <div className="text-[#37352f]">
                                    <RichTextEditor
                                      placeholder="Tecle '/' para comandos ou escreva livremente sua evolução..."
                                      value={data.evolutionText || ''}
                                      onValueChange={(val: string) => handleFieldChange('evolutionText', val)}
                                      disabled={disabled}
                                      patientId={patientId}
                                      imageUploadFolder={patientId ? `patients/${patientId}/evolutions/${safeEvolutionId}` : undefined}
                                      accentColor="violet"
                                      className="!p-0 !border-0 bg-transparent shadow-none w-full [&_.ProseMirror]:!p-0 [&_.ProseMirror]:!text-[#37352f] [&_.ProseMirror]:!text-base [&_.ProseMirror]:!leading-relaxed [&_.ProseMirror]:!min-h-[300px]"
                                    />                  </div>
                </div>
              </div>

              <div className="h-px bg-[#ECEBEA] mb-8 ml-12" />

              {/* H2 Header: Patient Report */}
              <div id="patientReport" className="flex items-baseline mb-8 group gap-4">
                <div className="w-8 flex-shrink-0 text-right text-sm font-medium text-[#D3D1CB] select-none">H2</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-[#37352f] mb-2 hover:text-[#2383e2] cursor-text transition-colors">Relato do Paciente</h2>
                    <span className="text-xs text-muted-foreground">{patientReportCount} caracteres</span>
                  </div>
                  <div className="text-[#37352f]">
                                    <RichTextEditor
                                      placeholder="O que o paciente relatou? Como se sente desde a última sessão?"
                                      value={data.patientReport || ''}
                                      onValueChange={(val: string) => handleFieldChange('patientReport', val)}
                                      disabled={disabled}
                                      patientId={patientId}
                                      imageUploadFolder={patientId ? `patients/${patientId}/evolutions/${safeEvolutionId}` : undefined}
                                      accentColor="sky"
                                      className="!p-0 !border-0 bg-transparent shadow-none w-full [&_.ProseMirror]:!p-0 [&_.ProseMirror]:!text-[#37352f] [&_.ProseMirror]:!text-base [&_.ProseMirror]:!leading-relaxed [&_.ProseMirror]:!min-h-[100px]"
                                    />                  </div>
                </div>
              </div>
            </div>
            <aside className="hidden lg:block lg:translate-x-4">
              <div className="sticky top-24 space-y-4 pb-28">
                <div className="p-4 rounded-xl border border-[#ECEBEA] bg-[#FBFBFA] shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  <h3 className="text-sm font-semibold text-[#37352f]">Evolução Clínica</h3>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Use “/” para inserir blocos, tabelas, callouts e mídias.</p>

                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>Última edição: {localLastSaved ? localLastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                    <p>Tempo desde a sessão: {summaryStats.timeSince}</p>
                    <p>Palavras‑chave: {summaryStats.keywords.length ? summaryStats.keywords.join(', ') : '—'}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {statusTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-full border transition-colors',
                          selectedTags.includes(tag)
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-white border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#ECEBEA] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#37352f]">Checklist da Sessão</h3>
                    <span className="text-xs text-muted-foreground">{checklistProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary transition-all" style={{ width: `${checklistProgress}%` }} />
                  </div>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-2 text-xs text-[#37352f]">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            setChecklist((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
                            )
                          }
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#ECEBEA] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#37352f]">Nível de Dor (EVA)</h3>
                    <span className="text-xs font-semibold text-[#37352f]">{painLevel}/10</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-3">
                    <div className="h-full bg-[#2383e2] transition-all" style={{ width: `${Math.min(100, painLevel * 10)}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => document.getElementById('pain-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="mt-3 text-xs text-[#2383e2] hover:underline"
                  >
                    Ir para seção
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* BEGIN: Bottom Action Bar */}
      <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E9E9E8] px-6 py-2 flex justify-between items-center z-50">
        <div className="text-xs text-gray-400">
          {/* Empty placeholder for balance */}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2 border-[#D9D9D7] text-[#37352f] hover:bg-[#F0F0EF]">
              <FileText className="h-4 w-4" />
              <span>PDF</span>
            </Button>
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                disabled={disabled || isSaving}
                className="h-8 gap-2 border-[#D9D9D7] text-[#37352f] hover:bg-[#F0F0EF]"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Salvar</span>
              </Button>
            )}
            <Button size="sm" className="h-8 gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white">
              <CheckSquare className="h-4 w-4" />
              <span>Concluir</span>
            </Button>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="flex items-center gap-4 text-xs text-[#37352f]">
            <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-500">Online</span>
            </div>
            {resolvedAutoSaveEnabled && localLastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Rascunho salvo às {localLastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </footer>

      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Atalhos de Teclado</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Salvar</span><kbd className="bg-muted px-2 py-1 rounded">Ctrl+S</kbd></div>
              <div className="flex justify-between"><span>Fechar modal</span><kbd className="bg-muted px-2 py-1 rounded">Escape</kbd></div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowShortcutsModal(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoizedNotionEvolutionPanel = React.memo(NotionEvolutionPanel);

MemoizedNotionEvolutionPanel.displayName = 'NotionEvolutionPanel (Memoized)';

export const NotionEvolutionPanelWrapper: React.FC<NotionEvolutionPanelProps> = (props) => (
  <RichTextProvider>
    <MemoizedNotionEvolutionPanel {...props} />
  </RichTextProvider>
);

export { NotionEvolutionPanelWrapper as NotionEvolutionPanel };
