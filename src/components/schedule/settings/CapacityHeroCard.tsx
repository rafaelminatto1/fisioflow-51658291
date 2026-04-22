import { Gauge, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CapacityHeroCardProps {
	onAddRule: () => void;
	totalVagasDia: number;
}

export function CapacityHeroCard({ onAddRule, totalVagasDia }: CapacityHeroCardProps) {
	return (
		<section className="rounded-xl p-6 border-l-4 border-l-blue-600 dark:border-l-blue-400 bg-card/90 backdrop-blur-sm border border-border/60 shadow-sm relative overflow-hidden">
			<div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<div className="flex items-center gap-2.5 mb-1.5">
						<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
							<Gauge className="h-4 w-4" />
						</div>
						<h2 className="text-xl font-semibold text-foreground">
							Capacidade de Atendimento por Horário
						</h2>
					</div>
					<p className="text-sm text-muted-foreground">
						Gerencie quantos pacientes podem ser agendados simultaneamente em cada bloco de horário.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
						{totalVagasDia} vagas/dia
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={onAddRule}
						className="flex items-center gap-1.5"
					>
						<Plus className="h-4 w-4" />
						Nova Regra
					</Button>
				</div>
			</div>
		</section>
	);
}
