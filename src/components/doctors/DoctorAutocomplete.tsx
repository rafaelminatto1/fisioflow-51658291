import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Stethoscope, Plus, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchDoctors } from "@/hooks/useDoctors";
import type { Doctor } from "@/types/doctor";

interface DoctorAutocompleteProps {
	value?: string; // Doctor name
	onSelect: (doctor: Doctor | null) => void;
	onCreateNew?: (searchTerm: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function DoctorAutocomplete({
	value = "",
	onSelect,
	onCreateNew,
	placeholder = "Selecione ou digite o nome do médico...",
	disabled = false,
	className,
}: DoctorAutocompleteProps) {
	const [open, setOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState(value);
	const [isFocused, setIsFocused] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const { data: doctors = [], isLoading } = useSearchDoctors(
		searchTerm,
		searchTerm.length >= 2,
	);

	// Update search term when value changes externally
	useEffect(() => {
		setSearchTerm(value);
	}, [value]);

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setOpen(false);
				setIsFocused(false);
			}
		};
		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [open]);

	const normalizedSearchTerm = searchTerm.trim();
	const hasExactMatch = doctors.some(
		(doctor) =>
			doctor.name?.trim().toLowerCase() === normalizedSearchTerm.toLowerCase(),
	);
	const shouldShowCreateOption = Boolean(
		onCreateNew && normalizedSearchTerm.length >= 2 && !hasExactMatch,
	);

	const handleSelect = (doctor: Doctor) => {
		setSearchTerm(doctor.name);
		onSelect(doctor);
		setOpen(false);
		setIsFocused(false);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setSearchTerm(newValue);
		setOpen(true);

		// If user clears the input, clear the selection
		if (!newValue) {
			onSelect(null);
		}
	};

	const handleCreateNew = () => {
		if (!shouldShowCreateOption) return;
		setOpen(false);
		setIsFocused(false);
		onCreateNew?.(normalizedSearchTerm);
	};

	const showDropdown =
		open &&
		(isLoading ||
			doctors.length > 0 ||
			shouldShowCreateOption ||
			searchTerm.length >= 2);

	return (
		<div className={cn("relative w-full", className)} ref={containerRef}>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
				<Input
					type="text"
					placeholder={placeholder}
					value={searchTerm}
					onChange={handleInputChange}
					onFocus={() => {
						setIsFocused(true);
						setOpen(true);
					}}
					className="pl-10 h-10 w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus-visible:ring-2 focus-visible:ring-blue-500/40"
					disabled={disabled}
				/>
				{isLoading && (
					<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
				)}
			</div>

			{/* Dropdown - Matching Agenda layout */}
			{showDropdown && (
				<div className="absolute top-full left-0 mt-1 w-full max-h-[300px] overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
					{isLoading ? (
						<div className="px-4 py-6 text-center text-sm text-muted-foreground">
							Buscando médicos...
						</div>
					) : (
						<div className="py-1">
							{doctors.length > 0 ? (
								<div className="border-b border-gray-100 dark:border-gray-700/50 mb-1">
									{doctors.map((doctor) => (
										<button
											key={doctor.id}
											onClick={() => handleSelect(doctor)}
											className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3 border-b border-gray-50 dark:border-gray-700/30 last:border-0"
										>
											<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800/50">
												<span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
													{(doctor.name.startsWith("Dr")
														? doctor.name.substring(3)
														: doctor.name
													)
														.charAt(0)
														.toUpperCase()}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
														{doctor.name}
													</p>
													{searchTerm.toLowerCase() ===
														doctor.name.toLowerCase() && (
														<Check className="h-3.5 w-3.5 text-blue-600" />
													)}
												</div>
												<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
													{doctor.specialty && (
														<span className="font-medium text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">
															{doctor.specialty}
														</span>
													)}
													{doctor.crm && (
														<span>
															• CRM {doctor.crm}
															{doctor.crm_state && `/${doctor.crm_state}`}
														</span>
													)}
													{doctor.phone && <span>• {doctor.phone}</span>}
												</div>
												{doctor.clinic_name && (
													<p className="text-[11px] text-muted-foreground mt-0.5 truncate italic">
														{doctor.clinic_name}
													</p>
												)}
											</div>
										</button>
									))}
								</div>
							) : (
								searchTerm.length >= 2 && (
									<div className="px-4 py-4 text-center text-sm text-muted-foreground">
										Nenhum médico encontrado
									</div>
								)
							)}

							{shouldShowCreateOption && (
								<button
									onClick={handleCreateNew}
									className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3 text-blue-600 dark:text-blue-400"
								>
									<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-700/50">
										<Plus className="h-4 w-4" />
									</div>
									<div className="flex flex-col">
										<span className="font-bold text-sm">
											Cadastrar novo médico
										</span>
										<span className="text-xs opacity-80 italic">
											"{normalizedSearchTerm}"
										</span>
									</div>
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
