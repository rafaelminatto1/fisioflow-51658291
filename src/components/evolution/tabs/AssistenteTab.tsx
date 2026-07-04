/**
 * AssistenteTab - Tab component for AI assistant, WhatsApp, and gamification
 *
 * Extracted from PatientEvolution for better code splitting and performance
 * Requirements: 4.1, 4.4 - Component-level code splitting
 *
 * @version 1.0.0
 */

import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Bot, BrainCircuit, MessageCircle, Settings2, Trophy } from 'lucide-react';

// Lazy load heavy components
const LazyTreatmentAssistant = lazy(() =>
  import('@/components/ai/TreatmentAssistant').then((m) => ({
    default: m.TreatmentAssistant,
  }))
);
const LazyWhatsAppIntegration = lazy(() =>
  import('@/components/whatsapp/WhatsAppIntegration').then((m) => ({
    default: m.WhatsAppIntegration,
  }))
);
interface AssistenteTabProps {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  currentObservation?: string;
  onApplyToSoap: (
    field: 'subjective' | 'objective' | 'assessment' | 'plan',
    content: string
  ) => void;
}

export function AssistenteTab({
  patientId,
  patientName,
  patientPhone,
  currentObservation,
  onApplyToSoap,
}: AssistenteTabProps) {
  const hasPhone = Boolean(patientPhone?.trim());

  return (
    <div className="mt-4 space-y-4">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/15">
                <BrainCircuit className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight">Copiloto da sessão</h2>
                  <Badge className="border-cyan-300/30 bg-cyan-300/15 text-cyan-50 hover:bg-cyan-300/20">
                    IA clínica
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Ações rápidas para analisar, aplicar na evolução e comunicar {patientName}.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                <span className="block text-slate-400">Dados</span>
                <strong className="flex items-center gap-1.5 font-semibold text-white">
                  <Activity className="h-3.5 w-3.5 text-emerald-300" />
                  Sessão ativa
                </strong>
              </div>
              <div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                <span className="block text-slate-400">WhatsApp</span>
                <strong className="flex items-center gap-1.5 font-semibold text-white">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-300" />
                  {hasPhone ? 'Telefone pronto' : 'Sem telefone'}
                </strong>
              </div>
              <div className="rounded-lg bg-white/10 px-3 py-2 ring-1 ring-white/10">
                <span className="block text-slate-400">Fluxo</span>
                <strong className="flex items-center gap-1.5 font-semibold text-white">
                  <Bot className="h-3.5 w-3.5 text-cyan-300" />
                  Aplicar ao prontuário
                </strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(360px,0.95fr)]">
        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyTreatmentAssistant
            patientId={patientId}
            patientName={patientName}
            currentObservation={currentObservation}
            onApplyToSoap={onApplyToSoap}
          />
        </Suspense>

        <Suspense fallback={<LoadingSkeleton type="card" />}>
          <LazyWhatsAppIntegration patientId={patientId} patientPhone={patientPhone} />
        </Suspense>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold">Comunicação completa</p>
                <p className="text-xs text-muted-foreground">
                  Histórico, caixa de entrada e conversa longa ficam no CRM.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/crm-whatsapp">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Engajamento</p>
                <p className="text-xs text-muted-foreground">Detalhes na área de gamificação.</p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/gamification">Abrir</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-slate-600" />
              <div>
                <p className="text-sm font-semibold">Automações e templates</p>
                <p className="text-xs text-muted-foreground">
                  Configurações persistentes ficam na área de templates do WhatsApp.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/whatsapp/templates">Gerenciar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
