import {
	ArrowRight,
	FileText,
	Image as ImageIcon,
	Search,
	Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClinicalTestCatalogRecord } from "@/data/clinicalTestsCatalog";

interface ClinicalTestsGridProps {
	isLoading: boolean;
	tests: ClinicalTestCatalogRecord[];
	onSelectTest: (test: ClinicalTestCatalogRecord) => void;
	onClearFilters: () => void;
}

function getBadgeColor(category: string | null) {
	switch (category) {
		case "Esportiva":
			return "border-orange-100 bg-orange-50 text-orange-700";
		case "Pós-Operatório":
			return "border-emerald-100 bg-emerald-50 text-emerald-700";
		default:
			return "border-blue-100 bg-blue-50 text-blue-700";
	}
}

export function ClinicalTestsGrid({
	isLoading,
	tests,
	onSelectTest,
	onClearFilters,
}: ClinicalTestsGridProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={`clinical-test-skeleton-${index}`}
						className="overflow-hidden rounded-[28px] border border-slate-200 bg-white"
					>
						<Skeleton className="h-48 w-full rounded-none" />
						<div className="space-y-4 p-5">
							<div className="flex gap-2">
								<Skeleton className="h-5 w-20 rounded-full" />
								<Skeleton className="h-5 w-24 rounded-full" />
							</div>
							<Skeleton className="h-7 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-10 w-full rounded-xl" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (tests.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-white px-4 py-20 text-center shadow-sm">
				<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 shadow-inner">
					<Search className="h-10 w-10 text-slate-300" />
				</div>
				<h3 className="text-xl font-semibold text-slate-900">
					Nenhum teste encontrado
				</h3>
				<p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
					Não houve correspondência com o termo ou filtro atual. Limpe a busca
					para voltar ao acervo completo.
				</p>
				<Button
					variant="outline"
					className="mt-6 border-teal-200 text-teal-700 hover:bg-teal-50"
					onClick={onClearFilters}
				>
					Limpar filtros
				</Button>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
			{tests.map((test) => {
				const resourceCount = test.evidence_resources?.length ?? 0;

				return (
					<button
						key={test.id}
						type="button"
						onClick={() => onSelectTest(test)}
						className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/8"
					>
						<div className="relative h-52 overflow-hidden border-b border-slate-100 bg-slate-50">
							{test.image_url || test.media_urls?.[0] ? (
								<img
									src={test.image_url || test.media_urls?.[0]}
									alt={test.name}
									className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
									loading="lazy"
								/>
							) : (
								<div className="absolute inset-0 flex items-center justify-center text-slate-300">
									<ImageIcon className="h-12 w-12 opacity-40" />
								</div>
							)}

							<div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
								<span
									className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm ${getBadgeColor(test.category)}`}
								>
									{test.category || "Geral"}
								</span>

								{test.is_builtin ? (
									<span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
										<Sparkles className="h-3.5 w-3.5" />
										Biblioteca
									</span>
								) : (
									<span className="rounded-full border border-white/20 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 backdrop-blur-sm">
										Customizado
									</span>
								)}
							</div>
						</div>

						<div className="space-y-4 p-5">
							<div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
								<span>{test.target_joint || "Sem região"}</span>
								<span className="inline-flex items-center gap-1 text-teal-700">
									Ver detalhes
									<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
								</span>
							</div>

							<div>
								<h3 className="text-xl font-semibold leading-tight text-slate-900 transition-colors group-hover:text-teal-700">
									{test.name}
								</h3>
								{test.name_en ? (
									<p className="mt-1 text-sm italic text-slate-400">
										{test.name_en}
									</p>
								) : null}
							</div>

							<p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
								{test.purpose || "Sem objetivo clínico cadastrado."}
							</p>

							<div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
								{(test.tags ?? []).slice(0, 3).map((tag) => (
									<span
										key={tag}
										className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500"
									>
										#{tag}
									</span>
								))}
							</div>

							<div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
								<div>
									<p className="font-medium text-slate-700">
										{test.evidence_label || "Base clínica"}
									</p>
									<p className="text-slate-500">
										{resourceCount > 0
											? `${resourceCount} materiais de apoio`
											: "Sem anexo local"}
									</p>
								</div>
								<FileText className="h-5 w-5 text-teal-600" />
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
