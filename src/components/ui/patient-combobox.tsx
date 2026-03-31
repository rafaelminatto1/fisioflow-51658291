import Fuse from "fuse.js";
import * as React from "react";
import { Check, ChevronsUpDown, Search, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { Patient } from "@/types";
import { fisioLogger as logger } from "@/lib/errors/logger";

interface PatientComboboxProps
	extends Omit<
		React.ComponentPropsWithoutRef<typeof Button>,
		"value" | "onChange" | "children"
	> {
	patients: Patient[];
	value?: string;
	onValueChange: (value: string) => void;
	onCreateNew?: (searchTerm: string) => void;
	/** Nome a exibir quando value está setado mas o paciente ainda não está na lista (ex.: recém-criado) */
	fallbackDisplayName?: string;
	/** Descrição opcional para o fallback (ex.: "Recém-cadastrado") */
	fallbackDescription?: string;
	disabled?: boolean;
	className?: string;
	/** Modo inline: a caixa de busca e resultados aparecem diretamente, sem popover */
	inline?: boolean;
}

export function PatientCombobox({
	patients,
	value,
	onValueChange,
	onCreateNew,
	fallbackDisplayName,
	fallbackDescription,
	disabled = false,
	className,
	inline = false,
	...buttonProps
}: PatientComboboxProps) {
	React.useEffect(() => {
		logger.debug(
			"PatientCombobox mounted",
			{ patientsLength: patients?.length, inline },
			"PatientCombobox",
		);
	}, [patients, inline]);

	const [open, setOpen] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [inputValue, setInputValue] = React.useState("");
	const canCreateNew = typeof onCreateNew === "function";
	const hasFallbackDisplay = Boolean(
		fallbackDisplayName && (value || disabled),
	);

	const selectedPatient = React.useMemo(
		() => patients.find((patient) => patient.id === value),
		[patients, value],
	);

	const getPatientName = (patient?: Patient | null) =>
		patient?.name || patient?.full_name || "Paciente sem nome";

	const getPatientInitials = (name?: string | null) => {
		const resolvedName = name?.trim();
		if (!resolvedName) return "PT";

		const parts = resolvedName.split(/\s+/).filter(Boolean);
		const initials = parts
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() || "")
			.join("");
		return initials || "PT";
	};

	const getPatientMeta = (patient?: Patient | null, description?: string) => {
		if (!patient) {
			return description || "Busque por nome, CPF ou telefone";
		}

		const details = [
			patient.phone,
			patient.cpf ? `CPF ${patient.cpf}` : null,
		].filter(Boolean) as string[];

		if (patient.incomplete_registration) {
			details.unshift("Cadastro incompleto");
		}

		return (
			details.slice(0, 2).join(" • ") || description || "Paciente selecionado"
		);
	};

	// Initialize Fuse instance with improved settings
	const fuse = React.useMemo(() => {
		return new Fuse(patients, {
			keys: [
				{ name: "name", weight: 0.7 },
				{ name: "full_name", weight: 0.7 },
				{ name: "cpf", weight: 0.3 },
				{ name: "phone", weight: 0.3 },
			],
			threshold: 0.3,
			ignoreLocation: true,
			minMatchCharLength: 1,
			includeScore: true,
			isCaseSensitive: false,
			findAllMatches: true,
			useExtendedSearch: true,
		});
	}, [patients]);

	const filteredPatients = React.useMemo(() => {
		const trimmedSearch = inputValue.trim();

		// Se inline, só busca após 3 caracteres (pedido do usuário)
		if (inline && trimmedSearch.length < 3) return [];

		if (!trimmedSearch || trimmedSearch === "") return patients;

		const searchTerm = trimmedSearch.toLowerCase();
		const normalizedDigits = searchTerm.replace(/\D/g, "");

		const matchName = (p: Patient) =>
			(p.name && p.name.toLowerCase().includes(searchTerm)) ||
			(p.full_name && p.full_name.toLowerCase().includes(searchTerm));

		const matchCpf = (p: Patient) => {
			if (!p.cpf) return false;
			if (p.cpf.toLowerCase().includes(searchTerm)) return true;
			if (
				normalizedDigits.length >= 2 &&
				p.cpf.replace(/\D/g, "").includes(normalizedDigits)
			)
				return true;
			return false;
		};

		const matchPhone = (p: Patient) => {
			if (!p.phone) return false;
			if (
				p.phone.includes(searchTerm) ||
				p.phone.replace(/\D/g, "").includes(searchTerm)
			)
				return true;
			if (
				normalizedDigits.length >= 2 &&
				p.phone.replace(/\D/g, "").includes(normalizedDigits)
			)
				return true;
			return false;
		};

		const directMatches = patients.filter(
			(p) => matchName(p) || matchCpf(p) || matchPhone(p),
		);

		const results = fuse.search(searchTerm);
		const mapped = results
			.sort((a, b) => (a.score || 0) - (b.score || 0))
			.map((result) => result.item);

		const resultList = directMatches.length > 0 ? directMatches : mapped;
		logger.debug(
			"PatientCombobox filtering",
			{ searchTerm, direct: directMatches.length, fuzzy: mapped.length },
			"PatientCombobox",
		);
		return resultList;
	}, [fuse, inputValue, patients, inline]);

	const handleSelect = (patientId: string) => {
		logger.debug(
			"PatientCombobox handleSelect called",
			{ patientId, callback: !!onValueChange },
			"PatientCombobox",
		);
		onValueChange(patientId === value ? "" : patientId);
		setOpen(false);
		setInputValue("");
	};

	const handleCreateNew = () => {
		if (!canCreateNew || !onCreateNew) return;
		setOpen(false);
		onCreateNew(inputValue);
		setInputValue("");
	};

	const CommandContent = (
		<Command
			shouldFilter={false}
			loop
			className={cn(
				"relative rounded-[inherit] bg-transparent",
				inline && "rounded-2xl border border-border/60 bg-white dark:bg-slate-950",
			)}
		>
			<div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
			<div
				className={cn(
					"border-b border-border/60 px-3 py-3.5",
					!inline &&
						"bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.07),transparent_26%),linear-gradient(180deg,rgba(248,250,252,0.92),rgba(248,250,252,0.78))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))]",
					inline && "bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl",
				)}
			>
				<div className="mb-3 flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/75">
							Buscar paciente
						</p>
						<p className="truncate text-xs text-muted-foreground">
							{inline && inputValue.length < 3
								? "Digite 3 ou mais caracteres para buscar"
								: "Encontre rapidamente por nome, CPF ou telefone"}
						</p>
					</div>
					{filteredPatients.length > 0 && (
						<span className="shrink-0 rounded-full border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
							{filteredPatients.length}{" "}
							{filteredPatients.length === 1 ? "resultado" : "resultados"}
						</span>
					)}
				</div>

				<CommandInput
					ref={inputRef}
					data-testid="patient-search"
					placeholder="Buscar por nome, CPF ou telefone..."
					value={inputValue}
					onValueChange={setInputValue}
					autoFocus={inline}
					wrapperClassName={cn(
						"mx-0 mt-0 rounded-2xl border border-white/80 bg-white/85 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_12px_24px_-20px_rgba(15,23,42,0.45)] backdrop-blur dark:border-white/10 dark:bg-white/5",
						inline && "shadow-none border-border/60 bg-white",
					)}
					iconClassName="text-primary/70"
					className="h-12 py-0 text-sm"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							if (
								canCreateNew &&
								inputValue &&
								filteredPatients.length === 0
							) {
								e.preventDefault();
								handleCreateNew();
							}
						}
					}}
				/>
			</div>

			<CommandList className={cn("max-h-[22rem] overflow-y-auto px-2 pb-2 pt-1.5")}>
				{inputValue.length >= (inline ? 3 : 0) && filteredPatients.length === 0 && (
					<CommandEmpty className="py-0">
						<div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-muted to-background text-muted-foreground shadow-sm">
								<Search className="h-4 w-4" />
							</div>
							<div className="space-y-1">
								<p className="text-sm font-semibold text-foreground">
									Nenhum paciente encontrado
								</p>
								<p className="text-xs text-muted-foreground">
									{inputValue
										? `Nenhum resultado para "${inputValue}".`
										: "Digite para buscar um paciente."}
								</p>
							</div>
							{canCreateNew && (
								<Button
									type="button"
									size="sm"
									variant="secondary"
									onClick={handleCreateNew}
									className="mt-1 w-full gap-2 rounded-2xl border border-primary/10 bg-primary/5 text-primary shadow-sm hover:bg-primary/10"
								>
									<UserPlus className="w-4 h-4" />
									Cadastrar novo paciente
								</Button>
							)}
						</div>
					</CommandEmpty>
				)}

				{filteredPatients.length > 0 && (
					<CommandGroup
						heading="Pacientes encontrados"
						className="px-1 pt-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-0 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.18em] [&_[cmdk-group-heading]]:text-muted-foreground/80"
					>
						{filteredPatients.map((patient) => (
							<CommandItem
								key={patient.id}
								value={`${patient.name || patient.full_name || ""} ${patient.cpf || ""} ${patient.id}`}
								onSelect={() => handleSelect(patient.id)}
								className={cn(
									"group mb-1 cursor-pointer rounded-2xl border border-transparent px-3 py-3 text-foreground transition-all hover:border-border/80 hover:bg-muted/50 data-[selected=true]:border-primary/20 data-[selected=true]:bg-primary/[0.05]",
									!inline &&
										"bg-gradient-to-b from-background to-background hover:-translate-y-px hover:shadow-[0_16px_30px_-26px_rgba(15,23,42,0.35)] data-[selected=true]:from-primary/[0.07] data-[selected=true]:to-background data-[selected=true]:shadow-[0_20px_34px_-28px_rgba(37,99,235,0.45)]",
								)}
							>
								<div className="flex min-w-0 flex-1 items-start gap-3">
									<div
										className={cn(
											"relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-[11px] font-semibold tracking-[0.16em] shadow-sm transition-all",
											value === patient.id
												? "border-primary/20 bg-primary text-primary-foreground"
												: "border-border/60 bg-muted/90 text-foreground/70 group-hover:border-primary/15 group-hover:text-primary",
										)}
									>
										{value === patient.id ? (
											<Check className="relative h-4 w-4" />
										) : (
											<span className="relative">
												{getPatientInitials(getPatientName(patient))}
											</span>
										)}
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<span className="truncate text-sm font-semibold text-foreground">
												{getPatientName(patient)}
											</span>
											{value === patient.id && (
												<span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
													Selecionado
												</span>
											)}
										</div>

										<div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
											{patient.phone && (
												<span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5">
													{patient.phone}
												</span>
											)}
											{patient.cpf && (
												<span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5">
													CPF {patient.cpf}
												</span>
											)}
											{!patient.phone && !patient.cpf && (
												<span>Sem telefone ou CPF cadastrado</span>
											)}
										</div>
									</div>

									{value === patient.id && (
										<div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
											<Check className="h-4 w-4" />
										</div>
									)}
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{/* Always show create option at bottom if there is input */}
				{canCreateNew &&
					inputValue.length > 0 &&
					filteredPatients.length > 0 && (
						<div className="border-t border-border/60 p-2">
							<CommandGroup className="p-0">
								<CommandItem
									onSelect={handleCreateNew}
									className="cursor-pointer rounded-2xl border border-transparent px-3 py-3 text-primary transition-all data-[selected=true]:border-primary/10 data-[selected=true]:bg-primary/5"
								>
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/10 bg-primary/5 text-primary shadow-sm">
											<UserPlus className="h-4 w-4" />
										</div>
										<div className="flex flex-col text-left">
											<span className="text-sm font-semibold">
												Cadastrar novo paciente
											</span>
											<span className="text-xs text-muted-foreground">
												Usar "{inputValue}" como nome inicial
											</span>
										</div>
									</div>
								</CommandItem>
							</CommandGroup>
						</div>
					)}
			</CommandList>
		</Command>
	);

	if (inline) {
		return (
			<div className={cn("space-y-4", className)}>
				{/* Display current selection even in inline mode */}
				{(selectedPatient || hasFallbackDisplay) && (
					<div
						className={cn(
							"flex h-auto min-h-[60px] w-full items-center gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.02] px-3 py-3 shadow-sm",
						)}
					>
						<div
							className={cn(
								"relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/20 via-primary/10 to-sky-500/10 text-[11px] font-semibold tracking-[0.16em] text-primary shadow-sm",
							)}
						>
							<span className="relative">
								{getPatientInitials(
									selectedPatient
										? getPatientName(selectedPatient)
										: fallbackDisplayName,
								)}
							</span>
						</div>

						<div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
							<span className="mb-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
								Paciente Selecionado
							</span>
							<span className="truncate text-sm font-semibold text-foreground">
								{selectedPatient
									? getPatientName(selectedPatient)
									: fallbackDisplayName}
							</span>
							<span className="truncate text-xs text-muted-foreground">
								{selectedPatient
									? getPatientMeta(selectedPatient)
									: getPatientMeta(undefined, fallbackDescription)}
							</span>
						</div>

						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onValueChange("")}
							className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
						>
							Alterar
						</Button>
					</div>
				)}

				{CommandContent}
			</div>
		);
	}

	return (
		<Popover
			open={open}
			onOpenChange={(newOpen) => {
				setOpen(newOpen);
				if (!newOpen) {
					setInputValue("");
				}
			}}
		>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					data-testid="patient-select"
					aria-expanded={open}
					aria-label={
						selectedPatient
							? `Paciente selecionado: ${getPatientName(selectedPatient)}`
							: hasFallbackDisplay
								? `Paciente selecionado: ${fallbackDisplayName}`
								: "Selecionar paciente"
					}
					className={cn(
						"group relative h-auto min-h-[60px] w-full overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/30 px-3 py-3 text-left font-normal text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.06),0_18px_34px_-26px_rgba(15,23,42,0.35)] transition-[border-color,box-shadow,background-color,transform] hover:border-primary/35 hover:!bg-transparent hover:from-background hover:to-primary/[0.03] hover:text-foreground hover:shadow-[0_1px_2px_rgba(15,23,42,0.08),0_24px_40px_-28px_rgba(37,99,235,0.38)] focus-visible:ring-primary/20 data-[state=open]:border-primary/40 data-[state=open]:!bg-transparent data-[state=open]:from-background data-[state=open]:to-primary/[0.03] data-[state=open]:text-foreground data-[state=open]:shadow-[0_1px_2px_rgba(15,23,42,0.08),0_28px_50px_-32px_rgba(37,99,235,0.45)] aria-[invalid=true]:border-destructive/70 aria-[invalid=true]:shadow-[0_0_0_4px_hsl(var(--destructive)/0.08)] disabled:bg-muted/40 disabled:text-muted-foreground",
						className,
					)}
					disabled={disabled}
					{...buttonProps}
				>
					<span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-80" />

					<div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
						<div
							className={cn(
								"relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-[11px] font-semibold tracking-[0.16em] shadow-sm transition-all",
								selectedPatient || hasFallbackDisplay
									? "border-primary/15 bg-gradient-to-br from-primary/20 via-primary/10 to-sky-500/10 text-primary"
									: "border-border/60 bg-gradient-to-br from-muted/80 to-background text-muted-foreground",
							)}
						>
							<span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),transparent_58%)] opacity-70" />
							{selectedPatient || hasFallbackDisplay ? (
								<span className="relative">
									{getPatientInitials(
										selectedPatient
											? getPatientName(selectedPatient)
											: fallbackDisplayName,
									)}
								</span>
							) : (
								<User className="relative h-4 w-4" />
							)}
						</div>

						{selectedPatient ? (
							<div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
								<span className="mb-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
									Paciente
								</span>
								<span className="truncate text-sm font-semibold text-foreground">
									{getPatientName(selectedPatient)}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{getPatientMeta(selectedPatient)}
								</span>
							</div>
						) : hasFallbackDisplay ? (
							<div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
								<span className="mb-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
									Paciente
								</span>
								<span className="truncate text-sm font-semibold text-foreground">
									{fallbackDisplayName}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{getPatientMeta(undefined, fallbackDescription)}
								</span>
							</div>
						) : (
							<div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight">
								<span className="mb-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
									Seleção
								</span>
								<span className="truncate text-sm font-medium text-foreground">
									Selecione o paciente
								</span>
								<span className="truncate text-xs text-muted-foreground">
									Busque por nome, CPF ou telefone
								</span>
							</div>
						)}
					</div>

					<div
						className={cn(
							"ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 shadow-sm transition-all",
							open && "border-primary/20 bg-primary/5 text-primary",
						)}
					>
						<ChevronsUpDown
							className={cn(
								"h-4 w-4 text-muted-foreground transition-transform duration-200",
								open && "rotate-180 text-primary",
							)}
						/>
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-border/70 bg-background/95 p-0 shadow-[0_24px_80px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl"
				align="start"
				sideOffset={8}
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					inputRef.current?.focus();
				}}
			>
				{CommandContent}
			</PopoverContent>
		</Popover>
	);
}
