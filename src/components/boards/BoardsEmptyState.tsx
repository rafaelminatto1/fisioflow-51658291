import { ArrowRight, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BoardsEmptyStateProps {
  onCreate: () => void;
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BoardsEmptyState({ onCreate }: BoardsEmptyStateProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl relative">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_40%)] pointer-events-none" />

      <div className="grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center relative z-10">
        <div className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/80 backdrop-blur-md">
            <Sparkles className="mr-2 h-3 w-3 text-blue-400" />
            Workspace de boards
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
              Crie um board que pareça um centro de comando.
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-white/60 sm:text-base font-medium">
              Estruture colunas, concentre prioridades e acompanhe o fluxo da equipe com uma
              experiência mais próxima das melhores ferramentas de produtividade do mercado.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              onClick={onCreate}
              size="lg"
              className="rounded-2xl h-12 px-8 bg-white text-slate-950 font-black uppercase text-[10px] tracking-widest hover:bg-white/90 shadow-[0_4px_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all active:scale-95"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro board
            </Button>
            <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-3.5 text-xs font-bold text-white/40 backdrop-blur-md uppercase tracking-widest">
              Pipeline • Operação • Sprints • CRM
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-white/10 p-3 text-white/80 border border-white/5">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <Badge className="rounded-full border-white/10 text-[9px] font-black text-white/50 uppercase tracking-widest px-2 py-0.5">
              Ready in minutes
            </Badge>
          </div>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4 hover:bg-white/10 transition-colors group">
              <div className="text-xs font-black uppercase tracking-widest text-white/80">
                Planejamento visual
              </div>
              <div className="mt-1 text-[10px] font-medium text-white/40 leading-relaxed">
                Colunas com limites WIP e visão rápida de progresso.
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/5 p-4 hover:bg-white/10 transition-colors group">
              <div className="text-xs font-black uppercase tracking-widest text-white/80">
                Foco em execução
              </div>
              <div className="mt-1 text-[10px] font-medium text-white/40 leading-relaxed">
                Cards, lista e calendário no mesmo espaço de trabalho.
              </div>
            </div>
            <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-white/50 px-2">
              <ArrowRight className="mr-2 h-3 w-3" />
              Libere o canvas completo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
