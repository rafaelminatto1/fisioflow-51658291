import { Search } from "lucide-react";

interface ClinicalTestsFilterProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	activeFilter: string;
	onFilterChange: (filter: string) => void;
	categories: readonly string[];
	joints: readonly string[];
	totalCount: number;
	filteredCount: number;
}

function FilterChip({
	label,
	active,
	onClick,
}: {
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
				active
					? "border-teal-200 bg-teal-50 text-teal-700 shadow-sm"
					: "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
			}`}
		>
			{label}
		</button>
	);
}

export function ClinicalTestsFilter({
	searchTerm,
	onSearchChange,
	activeFilter,
	onFilterChange,
	categories,
	joints,
	totalCount,
	filteredCount,
}: ClinicalTestsFilterProps) {
	return (
		<section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-col gap-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="space-y-1">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
							Busca clínica
						</p>
						<h2 className="text-xl font-semibold tracking-tight text-slate-900">
							Encontre rapidamente por teste, região, categoria ou tag
						</h2>
						<p className="text-sm text-slate-500">
							Mostrando {filteredCount} de {totalCount} testes disponíveis.
						</p>
					</div>

					<div className="relative w-full lg:max-w-md">
						<Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
						<input
							id="search-clinical-tests"
							name="search-clinical-tests"
							type="text"
							placeholder="Buscar teste, tag ou articulação"
							className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
							value={searchTerm}
							onChange={(event) => onSearchChange(event.target.value)}
						/>
					</div>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					<div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
							Categorias
						</p>
						<div className="flex flex-wrap gap-2">
							{categories.map((category) => (
								<FilterChip
									key={category}
									label={category}
									active={activeFilter === category}
									onClick={() => onFilterChange(category)}
								/>
							))}
						</div>
					</div>

					<div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
							Regiões e foco
						</p>
						<div className="flex flex-wrap gap-2">
							{joints
								.filter((joint) => joint !== "Todos")
								.map((joint) => (
									<FilterChip
										key={joint}
										label={joint}
										active={activeFilter === joint}
										onClick={() => onFilterChange(joint)}
									/>
								))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
