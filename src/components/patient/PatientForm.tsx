import React, { useState, forwardRef } from "react";
import { useForm, Controller } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";


import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	User,
	Phone,
	Mail,
	MapPin,
	Activity,
	HeartPulse,
	Shield,
	Briefcase,
	BadgeCheck,
} from "lucide-react";
import { PatientFormSchema, type PatientFormData } from "@/schemas/patient";
import { formatCPF, formatPhoneInput, formatCEP } from "@/utils/formatInputs";
import type {
	Patient,
	PatientCreateInput,
	PatientUpdateInput,
} from "@/hooks/patients/usePatientCrud/index";
import { MagicTextarea } from "@/components/ai/MagicTextarea";
import { BrasilService } from "@/services/brasilApi";
import { toast } from "sonner";
import { MultiSelect } from "@/components/ui/multi-select";
import { PATHOLOGY_OPTIONS } from "@/lib/constants/pathologies";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";

// ============================================================================================
// COMPONENT
// ============================================================================================

interface PatientFormProps {
	patient?: Patient;
	onSubmit?: (
		data: PatientCreateInput | PatientUpdateInput,
	) => void | Promise<void>;
	isLoading?: boolean;
	submitLabel?: string;
	organizationId: string;
	hideActions?: boolean;
	onCancel?: () => void;
	intent?: "create" | "update";
}

export const PatientForm = forwardRef<HTMLFormElement, PatientFormProps>(
	(
		{
			patient,
			onSubmit,
			isLoading = false,
			submitLabel = "Salvar",
			organizationId,
			hideActions = false,
			intent = "create",
			onCancel,
		},
		ref,
	) => {
		const [activeTab, setActiveTab] = useState<
			"basic" | "medical" | "address" | "additional"
		>("basic");

		

		const form = useForm<PatientFormData>({
			resolver: zodResolver(PatientFormSchema),
			defaultValues: {
				full_name: patient?.full_name || patient?.name || "",
				email: patient?.email || "",
				phone: patient?.phone || "",
				cpf: patient?.cpf || "",
				birth_date: patient?.birth_date || "",
				gender: patient?.gender || "masculino",
				address: patient?.address || "",
				city: patient?.city || "",
				state: patient?.state || "",
				zip_code: patient?.zip_code || "",
				emergency_contact: patient?.emergency_contact || "",
				emergency_contact_relationship:
					patient?.emergency_contact_relationship || "",
				emergency_phone: patient?.emergency_phone || "",
				medical_history: patient?.medical_history || "",
				main_condition: patient?.main_condition || "",
				allergies: patient?.allergies || "",
				medications: patient?.medications || "",
				weight_kg: patient?.weight_kg || undefined,
				height_cm: patient?.height_cm || undefined,
				blood_type: patient?.blood_type || "",
				marital_status: patient?.marital_status || "",
				profession: patient?.profession || "",
				education_level: patient?.education_level || "",
				health_insurance: patient?.health_insurance || "",
				insurance_number: patient?.insurance_number || "",
				observations: patient?.observations || "",
				status: (patient?.status as any) || "Inicial",
			},
		});

		const {
			register,
			handleSubmit,
			watch,
			setValue,
			formState: { errors, isDirty },
		} = form;

		const watchedBirthDate = watch("birth_date");
		const watchedCpf = watch("cpf");
		const watchedPhone = watch("phone");
		
		const watchedZipCode = watch("zip_code");

		// handlers
		const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setValue("cpf", formatCPF(e.target.value));
		};

		const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			setValue("phone", formatPhoneInput(e.target.value));
		};

		const handleZipCodeChange = async (
			e: React.ChangeEvent<HTMLInputElement>,
		) => {
			const value = formatCEP(e.target.value);
			setValue("zip_code", value);

			if (value.length === 9) {
				try {
					const data = await BrasilService.getCep(value.replace(/\D/g, ""));
					if (data) {
						setValue("address", data.street || "");
						setValue("city", data.city || "");
						setValue("state", data.state || "");
					}
				} catch (err) {
					console.error("Erro ao buscar CEP:", err);
				}
			}
		};

		const onFormSubmit = async (data: PatientFormData) => {
			try {
				const submitData: PatientCreateInput | PatientUpdateInput = {
					...data,
					status: (data.status as any) || (patient?.status as any) || "Inicial",
					organization_id: organizationId,
				};

				console.info("[PatientForm] Submit payload ready", {
					full_name: submitData.full_name,
					birth_date: submitData.birth_date,
					organization_id: submitData.organization_id,
				});

				// Remove organization_id if it exists since it might not be in the update type
				if (intent === "update" && "organization_id" in submitData) {
					delete (submitData as any).organization_id;
				}

				if (onSubmit) {
					await onSubmit(submitData as any);
				} else {
					// Native submission logic for React Router actions
					const formData = new FormData();
					formData.append("intent", intent);
					if (patient?.id) formData.append("id", patient.id);
					formData.append("data", JSON.stringify(submitData));
					
					// This relies on the parent component triggering requestSubmit() 
					// which is already handled via handleExternalSubmit in Modals
					// and for direct form submission we need to ensure the values are in the form
					
					const dataInput = (ref as any)?.current?.querySelector('input[name="data"]');
					if (dataInput) {
						dataInput.value = JSON.stringify(submitData);
					}
				}
			} catch (error) {
				console.error("[PatientForm] Submit Error:", error);
				toast.error("Erro ao salvar paciente. Tente novamente.");
			}
		};

		const onFormInvalid = (formErrors: FieldErrors<PatientFormData>) => {
			const firstField = Object.keys(formErrors)[0] as
				| keyof PatientFormData
				| undefined;
			let firstMsg = "Verifique os campos obrigatórios.";
			if (firstField && formErrors[firstField]) {
				const error = formErrors[firstField];
				if (error && typeof error === "object" && "message" in error) {
					firstMsg = String(error.message);
				}
			}
			console.error("[PatientForm] Validation blocked submit", {
				firstField,
				firstMessage: firstMsg,
				fields: Object.keys(formErrors),
			});
			toast.error(
				`Campo inválido: ${String(firstField || "formulário")} - ${String(firstMsg)}`,
			);
		};

		return (
			<form
				ref={ref}
				method="post"
				onSubmit={handleSubmit(onFormSubmit, onFormInvalid)}
				className="space-y-6"
				data-testid="patient-form"
			>
				<input type="hidden" name="intent" value={intent} />
				{patient?.id && <input type="hidden" name="id" value={patient.id} />}
				<input type="hidden" name="data" />
				<Tabs
					value={activeTab}
					onValueChange={(value) => setActiveTab(value as typeof activeTab)}
					className="w-full"
				>
					<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 overflow-x-auto -mx-1 px-1 scrollbar-hide">
						<TabsTrigger value="basic">
							<User className="w-4 h-4 mr-2" />
							Básico
						</TabsTrigger>
						<TabsTrigger value="medical">
							<Activity className="w-4 h-4 mr-2" />
							Médico
						</TabsTrigger>
						<TabsTrigger value="address">
							<MapPin className="w-4 h-4 mr-2" />
							Endereço
						</TabsTrigger>
						<TabsTrigger value="additional">
							<Briefcase className="w-4 h-4 mr-2" />
							Adicional
						</TabsTrigger>
					</TabsList>

					{/* Basic Information Tab */}
					<TabsContent value="basic" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<User className="w-5 h-5 text-primary" />
									Informações Pessoais
								</CardTitle>
								<CardDescription>
									Informações básicas do paciente
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{/* Nome */}
									<div className="space-y-2">
										<Label htmlFor="full_name">
											Nome Completo <span className="text-destructive">*</span>
										</Label>
										<Input
											id="full_name"
											data-testid="patient-name"
											placeholder="Nome completo do paciente"
											{...register("full_name")}
										/>
										{errors.full_name && (
											<p className="text-sm text-destructive">
												{errors.full_name.message}
											</p>
										)}
									</div>

									{/* Data de Nascimento */}
									<div className="space-y-2">
										<Label>
											Data de Nascimento{" "}
											<span className="text-slate-400 font-light">
												(Opcional)
											</span>
										</Label>
										<SmartDatePicker
											date={
												watchedBirthDate
													? new Date(watchedBirthDate)
													: undefined
											}
											onChange={(date) => {
												if (date) {
													setValue("birth_date", format(date, "yyyy-MM-dd"), {
														shouldValidate: true,
													});
												} else {
													setValue("birth_date", "", { shouldValidate: true });
												}
											}}
											placeholder="Selecione ou digite..."
											fromYear={1920}
										/>
										{errors.birth_date && (
											<p className="text-sm text-destructive">
												{errors.birth_date.message}
											</p>
										)}
									</div>

									{/* CPF */}
									<div className="space-y-2">
										<Label htmlFor="cpf">CPF</Label>
										<Input
											id="cpf"
											data-testid="patient-cpf"
											value={watchedCpf || ""}
											onChange={handleCpfChange}
											onBlur={() =>
												setValue("cpf", watchedCpf || "", {
													shouldValidate: true,
												})
											}
											placeholder="000.000.000-00"
											maxLength={14}
										/>
										{errors.cpf && (
											<p className="text-sm text-destructive">
												{errors.cpf.message}
											</p>
										)}
									</div>

									{/* Gênero */}
									<div className="space-y-2">
										<Label htmlFor="gender">Gênero</Label>
										<Controller
											name="gender"
											control={form.control}
											render={({ field }) => (
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<SelectTrigger id="gender">
														<SelectValue placeholder="Selecione o gênero" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="masculino">Masculino</SelectItem>
														<SelectItem value="feminino">Feminino</SelectItem>
														<SelectItem value="outro">Outro</SelectItem>
													</SelectContent>
												</Select>
											)}
										/>
										{errors.gender && (
											<p className="text-sm text-destructive">
												{errors.gender.message}
											</p>
										)}
									</div>

									{/* E-mail */}
									<div className="space-y-2">
										<Label htmlFor="email">E-mail</Label>
										<div className="relative">
											<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
											<Input
												id="email"
												type="email"
												className="pl-9"
												placeholder="exemplo@email.com"
												{...register("email")}
											/>
										</div>
										{errors.email && (
											<p className="text-sm text-destructive">
												{errors.email.message}
											</p>
										)}
									</div>

									{/* Telefone */}
									<div className="space-y-2">
										<Label htmlFor="phone">Telefone</Label>
										<div className="relative">
											<Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
											<Input
												id="phone"
												className="pl-9"
												placeholder="(00) 00000-0000"
												value={watchedPhone || ""}
												onChange={handlePhoneChange}
											/>
										</div>
										{errors.phone && (
											<p className="text-sm text-destructive">
												{errors.phone.message}
											</p>
										)}
									</div>

									{/* Status */}
									<div className="space-y-2">
										<Label htmlFor="status">Status do Paciente</Label>
										<Controller
											name="status"
											control={form.control}
											render={({ field }) => (
												<Select
													onValueChange={field.onChange}
													value={field.value}
												>
													<SelectTrigger id="status">
														<SelectValue placeholder="Selecione o status" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="Inicial">Inicial</SelectItem>
														<SelectItem value="Em Tratamento">
															Em Tratamento
														</SelectItem>
														<SelectItem value="Recuperação">
															Recuperação
														</SelectItem>
														<SelectItem value="Concluído">Concluído</SelectItem>
														<SelectItem value="Alta">Alta</SelectItem>
														<SelectItem value="Arquivado">Arquivado</SelectItem>
													</SelectContent>
												</Select>
											)}
										/>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Medical Information Tab */}
					<TabsContent value="medical" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<HeartPulse className="w-5 h-5 text-primary" />
									Histórico Clínico
								</CardTitle>
								<CardDescription>
									Principais queixas e condições de saúde
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="main_condition">
											Queixa Principal / Condição
										</Label>
										<Controller
											name="main_condition"
											control={form.control}
											render={({ field }) => (
												<MultiSelect
													options={PATHOLOGY_OPTIONS}
													selected={
														field.value
															? field.value
																	.split(",")
																	.map((s) => s.trim())
																	.filter(Boolean)
															: []
													}
													onChange={(vals) => field.onChange(vals.join(", "))}
													placeholder="Pesquisar, selecionar ou digitar patologias..."
													allowCustom={true}
												/>
											)}
										/>
										{errors.main_condition && (
											<p className="text-sm text-destructive">
												{errors.main_condition.message}
											</p>
										)}
									</div>

									<div className="space-y-2">
										<Label htmlFor="medical_history">Histórico Médico</Label>
										<MagicTextarea
											id="medical_history"
											placeholder="Descreva o histórico de saúde, cirurgias anteriores, etc."
											value={watch("medical_history") || ""}
											onValueChange={(val: string) => setValue("medical_history", val)}
										/>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="allergies">Alergias</Label>
											<Input
												id="allergies"
												placeholder="Medicamentos, alimentos, etc."
												{...register("allergies")}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="medications">Medicamentos em Uso</Label>
											<Input
												id="medications"
												placeholder="Liste os medicamentos atuais"
												{...register("medications")}
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
										<div className="space-y-2">
											<Label htmlFor="weight_kg">Peso (kg)</Label>
											<Input
												id="weight_kg"
												type="number"
												step="0.1"
												placeholder="00.0"
												{...register("weight_kg", { valueAsNumber: true })}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="height_cm">Altura (cm)</Label>
											<Input
												id="height_cm"
												type="number"
												placeholder="000"
												{...register("height_cm", { valueAsNumber: true })}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="blood_type">Tipo Sanguíneo</Label>
											<Controller
												name="blood_type"
												control={form.control}
												render={({ field }) => (
													<Select
														onValueChange={field.onChange}
														value={field.value}
													>
														<SelectTrigger id="blood_type">
															<SelectValue placeholder="Selecione" />
														</SelectTrigger>
														<SelectContent>
															{[
																"A+",
																"A-",
																"B+",
																"B-",
																"AB+",
																"AB-",
																"O+",
																"O-",
															].map((type) => (
																<SelectItem key={type} value={type}>
																	{type}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											/>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Address Tab */}
					<TabsContent value="address" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<MapPin className="w-5 h-5 text-primary" />
									Endereço e Contato
								</CardTitle>
								<CardDescription>
									Onde o paciente reside e contatos de emergência
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="zip_code">CEP</Label>
										<Input
											id="zip_code"
											placeholder="00000-000"
											value={watchedZipCode || ""}
											onChange={handleZipCodeChange}
											maxLength={9}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="address">Logradouro / Rua</Label>
										<Input
											id="address"
											placeholder="Rua, Avenida..."
											{...register("address")}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="city">Cidade</Label>
										<Input
											id="city"
											placeholder="Cidade"
											{...register("city")}
										/>
									</div>

									<div className="space-y-2">
										<Label htmlFor="state">Estado (UF)</Label>
										<Input
											id="state"
											placeholder="Estado"
											maxLength={2}
											{...register("state")}
										/>
									</div>
								</div>

								<div className="border-t pt-4 mt-2">
									<h4 className="text-sm font-bold mb-4">
										Contato de Emergência
									</h4>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="emergency_contact">Nome do Contato</Label>
											<Input
												id="emergency_contact"
												placeholder="Nome do responsável"
												{...register("emergency_contact")}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="emergency_phone">
												Telefone de Emergência
											</Label>
											<Input
												id="emergency_phone"
												placeholder="(00) 00000-0000"
												{...register("emergency_phone")}
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="emergency_contact_relationship">
												Parentesco / Relação
											</Label>
											<Input
												id="emergency_contact_relationship"
												placeholder="Ex: Cônjuge, Filho, Amigo"
												{...register("emergency_contact_relationship")}
											/>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Additional Information Tab */}
					<TabsContent value="additional" className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Shield className="w-5 h-5 text-primary" />
									Informações Complementares
								</CardTitle>
								<CardDescription>
									Seguro saúde, ocupação e observações internas
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label htmlFor="health_insurance">
											Convênio / Seguro Saúde
										</Label>
										<Input
											id="health_insurance"
											placeholder="Nome da operadora"
											{...register("health_insurance")}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="insurance_number">
											Número da Carteirinha
										</Label>
										<Input
											id="insurance_number"
											placeholder="0000000000000"
											{...register("insurance_number")}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="profession">Profissão / Ocupação</Label>
										<Input
											id="profession"
											placeholder="Ex: Engenheiro, Professor"
											{...register("profession")}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="education_level">Escolaridade</Label>
										<Input
											id="education_level"
											placeholder="Ex: Ensino Superior"
											{...register("education_level")}
										/>
									</div>
								</div>

								<div className="space-y-2">
									<Label htmlFor="observations">Observações Internas</Label>
									<MagicTextarea
										id="observations"
										placeholder="Anotações importantes sobre o paciente, preferências, etc."
										value={watch("observations") || ""}
										onValueChange={(val: string) => setValue("observations", val)}
									/>
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Action Buttons */}
				{!hideActions && (
					<div className="flex items-center justify-end gap-3 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-md pb-4 z-10 border-t border-slate-100 dark:border-slate-800">
						<Button
							type="button"
							variant="ghost"
							className="rounded-xl h-11 px-6 font-bold text-slate-500 hover:bg-slate-100"
							onClick={() => window.history.back()}
							disabled={isLoading}
						>
							Cancelar
						</Button>
						<Button
							type="submit"
							className="rounded-xl h-11 px-8 gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-900/10 font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
							disabled={isLoading}
						>
							{isLoading ? (
								<div className="flex items-center gap-2">
									<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
									Processando...
								</div>
							) : (
								<>
									<BadgeCheck className="w-4 h-4" />
									{submitLabel}
								</>
							)}
						</Button>
					</div>
				)}
			</form>
		);
	},
);

PatientForm.displayName = "PatientForm";
