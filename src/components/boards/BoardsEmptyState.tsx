import { ArrowRight, LayoutGrid, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BoardsEmptyStateProps {
	onCreate: () => void;
}

export function BoardsEmptyState({ onCreate }: BoardsEmptyStateProps) {
	return (
		<div className="overflow-hidden rounded-[32px] border border-border/60 bg-[linear-gradient(135deg,#0f172a,#111827,#1e293b)] text-white shadow-xl">
			<div className="grid gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
				<div className="space-y-5">
					<div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-white/80">
						<Sparkles className="mr-2 h-3.5 w-3.5" />
						Workspace de boards
					</div>
					<div className="space-y-3">
						<h3 className="text-3xl font-semibold tracking-tight">
							Crie um board que pareça um centro de comando, não só uma lista.
						</h3>
						<p className="max-w-2xl text-sm leading-7 text-white/74 sm:text-base">
							Estruture colunas, concentre prioridades e acompanhe o fluxo da
							equipe com uma experiência mais próxima das melhores ferramentas de
							produtividade do mercado.
						</p>
					</div>
					<div className="flex flex-wrap gap-3">
						<Button
							onClick={onCreate}
							size="lg"
							className="rounded-2xl bg-white text-slate-950 hover:bg-white/90"
						>
							<Plus className="mr-2 h-5 w-5" />
							Criar primeiro board
						</Button>
						<div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/74">
							Use boards para pipeline, operação clínica, sprint, suporte ou CRM.
						</div>
					</div>
				</div>

				<div className="rounded-[28px] border border-white/12 bg-white/10 p-5 backdrop-blur-sm">
					<div className="flex items-center justify-between">
						<div className="rounded-2xl bg-white/12 p-3">
							<LayoutGrid className="h-6 w-6" />
						</div>
						<div className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/72">
							Pronto em minutos
						</div>
					</div>
					<div className="mt-6 space-y-4">
						<div className="rounded-2xl bg-white/10 p-4">
							<div className="text-sm font-medium">Planejamento visual</div>
							<div className="mt-1 text-xs text-white/70">
								Colunas com limites WIP e visão rápida de progresso.
							</div>
						</div>
						<div className="rounded-2xl bg-white/10 p-4">
							<div className="text-sm font-medium">Foco em execução</div>
							<div className="mt-1 text-xs text-white/70">
								Cards, lista e calendário no mesmo espaço de trabalho.
							</div>
						</div>
						<div className="flex items-center text-sm text-white/78">
							<ArrowRight className="mr-2 h-4 w-4" />
							Crie o board para liberar o canvas completo.
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
