import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";
import {
	PATIENT_CARE_PROFILE_OPTIONS,
	PATIENT_DIRECTORY_PATHOLOGY_STATUSES,
	PATIENT_FINANCIAL_STATUS_OPTIONS,
	PATIENT_ORIGIN_OPTIONS,
	PATIENT_PAYER_MODEL_OPTIONS,
	PATIENT_THERAPY_FOCUS_OPTIONS,
} from "@/lib/constants/patient-directory";
import type { PatientFilters } from "./patientFiltersUtils";

export type { PatientFilters };

export interface PatientAdvancedFiltersProps {
	currentFilters: PatientFilters;
	onFilterChange: (filters: PatientFilters) => void;
	activeFiltersCount: number;
	onClearFilters: () => void;
	facets: {
		pathologies: string[];
		careProfiles: string[];
		sports: string[];
		therapyFocuses: string[];
		origins: string[];
		partners: string[];
	};
}

export function PatientAdvancedFilters({
	currentFilters,
	onFilterChange,
	activeFiltersCount,
	onClearFilters,
	facets,
}: PatientAdvancedFiltersProps) {
	const updateFilter = <K extends keyof PatientFilters>(
		key: K,
		value: PatientFilters[K],
	) => {
		onFilterChange({ ...currentFilters, [key]: value });
	};

	const pathologyOptions = facets.pathologies.map((value) => ({
		value,
		label: value,
	}));

	const sportOptions = facets.sports.map((value) => ({
		value,
		label: value,
	}));

	const partnerOptions = facets.partners.map((value) => ({
		value,
		label: value,
	}));

	const mergedCareProfiles = Array.from(
		new Map(
			[...PATIENT_CARE_PROFILE_OPTIONS, ...facets.careProfiles.map((value) => ({
				value,
				label: value,
			}))].map((option) => [option.value, option]),
		).values(),
	);

	const mergedFocuses = Array.from(
		new Map(
			[...PATIENT_THERAPY_FOCUS_OPTIONS, ...facets.therapyFocuses.map((value) => ({
				value,
				label: value,
			}))].map((option) => [option.value, option]),
		).values(),
	);

	const mergedOrigins = Array.from(
		new Map(
			[...PATIENT_ORIGIN_OPTIONS, ...facets.origins.map((value) => ({
				value,
				label: value,
			}))].map((option) => [option.value, option]),
		).values(),
	);

	return (
		<div className="space-y-5 py-2">
			<section className="space-y-3">
				<div>
					<p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
						Clínico
					</p>
					<p className="text-xs text-muted-foreground">
						Patologias, perfis assistenciais e foco terapêutico.
					</p>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Patologias</Label>
					<MultiSelect
						options={pathologyOptions}
						selected={currentFilters.pathologies ?? []}
						onChange={(value) => updateFilter("pathologies", value)}
						placeholder="Todas as patologias"
						allowCustom={false}
					/>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Status da patologia</Label>
					<Select
						value={currentFilters.pathologyStatus ?? "all"}
						onValueChange={(value) => updateFilter("pathologyStatus", value)}
					>
						<SelectTrigger className="h-11 rounded-2xl">
							<SelectValue placeholder="Todos os status clínicos" />
						</SelectTrigger>
						<SelectContent className="rounded-2xl">
							<SelectItem value="all">Todos os status clínicos</SelectItem>
							{PATIENT_DIRECTORY_PATHOLOGY_STATUSES.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Perfil assistencial</Label>
					<MultiSelect
						options={mergedCareProfiles}
						selected={currentFilters.careProfiles ?? []}
						onChange={(value) => updateFilter("careProfiles", value)}
						placeholder="Ex.: Esportivo, Pós-operatório"
					/>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Foco terapêutico</Label>
					<MultiSelect
						options={mergedFocuses}
						selected={currentFilters.therapyFocuses ?? []}
						onChange={(value) => updateFilter("therapyFocuses", value)}
						placeholder="Ex.: Liberação miofascial"
					/>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Esportes praticados</Label>
					<MultiSelect
						options={sportOptions}
						selected={currentFilters.sports ?? []}
						onChange={(value) => updateFilter("sports", value)}
						placeholder="Ex.: Corrida, Futebol"
					/>
				</div>

				<div className="flex items-center justify-between rounded-2xl border border-slate-200/70 px-3 py-2.5">
					<div>
						<p className="text-xs font-semibold">Com cirurgia vinculada</p>
						<p className="text-[11px] text-muted-foreground">
							Mantém apenas pacientes com cirurgia registrada.
						</p>
					</div>
					<Switch
						checked={Boolean(currentFilters.hasSurgery)}
						onCheckedChange={(checked) => updateFilter("hasSurgery", checked)}
					/>
				</div>
			</section>

			<Separator />

			<section className="space-y-3">
				<div>
					<p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
						Financeiro
					</p>
					<p className="text-xs text-muted-foreground">
						Modelo de pagamento e situação de cobrança.
					</p>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Modelo de pagamento</Label>
					<Select
						value={currentFilters.paymentModel ?? "all"}
						onValueChange={(value) => updateFilter("paymentModel", value)}
					>
						<SelectTrigger className="h-11 rounded-2xl">
							<SelectValue placeholder="Todos os modelos" />
						</SelectTrigger>
						<SelectContent className="rounded-2xl">
							<SelectItem value="all">Todos os modelos</SelectItem>
							{PATIENT_PAYER_MODEL_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Situação financeira</Label>
					<Select
						value={currentFilters.financialStatus ?? "all"}
						onValueChange={(value) => updateFilter("financialStatus", value)}
					>
						<SelectTrigger className="h-11 rounded-2xl">
							<SelectValue placeholder="Todas as situações" />
						</SelectTrigger>
						<SelectContent className="rounded-2xl">
							<SelectItem value="all">Todas as situações</SelectItem>
							{PATIENT_FINANCIAL_STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</section>

			<Separator />

			<section className="space-y-3">
				<div>
					<p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
						Origem e Relacionamento
					</p>
					<p className="text-xs text-muted-foreground">
						Origem do paciente e relacionamento de parceria.
					</p>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Origem</Label>
					<Select
						value={currentFilters.origin ?? "all"}
						onValueChange={(value) => updateFilter("origin", value)}
					>
						<SelectTrigger className="h-11 rounded-2xl">
							<SelectValue placeholder="Todas as origens" />
						</SelectTrigger>
						<SelectContent className="rounded-2xl">
							<SelectItem value="all">Todas as origens</SelectItem>
							{mergedOrigins.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label className="text-xs font-semibold">Parceria</Label>
					<Select
						value={currentFilters.partnerCompany ?? "all"}
						onValueChange={(value) => updateFilter("partnerCompany", value)}
					>
						<SelectTrigger className="h-11 rounded-2xl">
							<SelectValue placeholder="Todas as parcerias" />
						</SelectTrigger>
						<SelectContent className="rounded-2xl">
							<SelectItem value="all">Todas as parcerias</SelectItem>
							{partnerOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</section>

			{activeFiltersCount > 0 && (
				<Button
					variant="outline"
					size="sm"
					onClick={onClearFilters}
					className="w-full h-10 rounded-2xl border-dashed"
				>
					<X className="mr-2 h-4 w-4" />
					Limpar filtros avançados
				</Button>
			)}
		</div>
	);
}
