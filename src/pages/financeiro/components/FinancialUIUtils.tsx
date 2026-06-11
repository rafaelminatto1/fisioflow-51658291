import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function renderStatusBadge(status: string) {
	const normalized = status.toLowerCase();

	if (normalized === "concluido" || normalized === "pago") {
		return (
			<Badge className="border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
				Concluído
			</Badge>
		);
	}

	if (normalized === "cancelado") {
		return (
			<Badge className="border-0 bg-slate-500/10 text-slate-700 dark:text-slate-300">
				Cancelado
			</Badge>
		);
	}

	return (
		<Badge className="border-0 bg-amber-500/10 text-amber-700 dark:text-amber-300">
			Pendente
		</Badge>
	);
}

export function SectionSkeleton() {
	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{Array.from({ length: 4 }).map((_, index) => (
					<Card
						key={index}
						className="h-28 rounded-[28px] animate-pulse border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70"
					/>
				))}
			</div>
			<Card className="h-[420px] rounded-[32px] animate-pulse border-white/70 bg-white/90 dark:border-slate-800/80 dark:bg-slate-950/70" />
		</div>
	);
}

export function PageShellFallback() {
	return (
		<Card className="rounded-[28px] border-white/70 bg-white/90 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/70">
			<CardContent className="p-6">
				<div className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" />
			</CardContent>
		</Card>
	);
}
