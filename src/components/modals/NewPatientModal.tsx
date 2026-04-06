import React, { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
	User,
	Search,
	Loader2,
	Phone,
	Mail,
	MapPin,
	HeartPulse,
	Shield,
	Briefcase,
	UserPlus,
	AlertCircle,
	CheckCircle2,
	Building,
	Home,
	Users,
	Stethoscope,
	Pill,
	Scale,
	Droplet,
	Heart,
	GraduationCap,
	CreditCard,
	IdCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCPF, formatPhoneInput, formatCEP } from "@/utils/formatInputs";
import {
	cleanCPF,
	cleanPhone,
	emailSchema,
	cpfSchema,
	phoneSchema,
	sanitizeString,
	sanitizeEmail,
} from "@/lib/validations";
import { fisioLogger as logger } from "@/lib/errors/logger";
import { patientsApi } from "@/api/v2";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { MultiSelect } from "@/components/ui/multi-select";
import { PATHOLOGY_OPTIONS } from "@/lib/constants/pathologies";

const patientSchema = z.object({
	name: z
		.string()
		.min(2, "Nome deve ter pelo menos 2 caracteres")
		.max(200, "Nome muito longo"),
	email: emailSchema.optional().or(z.literal("")),
	phone: phoneSchema.optional().or(z.literal("")),
	cpf: z
		.string()
		.optional()
		.refine(
			(val) => {
				if (!val || val === "") return true;
				return cpfSchema.safeParse(val).success;
			},
			{ message: "CPF inválido" },
		),
	birth_date: z.date().optional(),
	gender: z.enum(["masculino", "feminino", "outro"]),
	session_value: z
		.union([z.number().min(0, "Valor inválido"), z.literal("")])
		.optional(),
	zip_code: z.string().max(9, "CEP inválido").optional(),
	address: z.string().max(500, "Endereço muito longo").optional(),
	address_number: z.string().max(20, "Número muito longo").optional(),
	address_complement: z.string().max(100, "Complemento muito longo").optional(),
	neighborhood: z.string().max(100, "Bairro muito longo").optional(),
	city: z.string().max(100, "Cidade muito longa").optional(),
	state: z.string().max(2, "UF inválida").optional(),
	emergency_contact: z.string().max(200, "Contato muito longo").optional(),
	emergency_contact_relationship: z
		.string()
		.max(100, "Parentesco muito longo")
		.optional(),
	medical_history: z.string().max(5000, "Histórico muito longo").optional(),
	main_condition: z.string().max(500, "Condição muito longa").optional(),
	allergies: z.string().max(500, "Alergias muito longas").optional(),
	medications: z.string().max(500, "Medicamentos muito longos").optional(),
	weight_kg: z
		.union([z.number().positive().max(500, "Peso inválido"), z.literal("")])
		.optional(),
	height_cm: z
		.union([z.number().positive().max(300, "Altura inválida"), z.literal("")])
		.optional(),
	blood_type: z.string().optional(),
	marital_status: z.string().optional(),
	profession: z.string().max(200, "Profissão muito longa").optional(),
	education_level: z.string().optional(),
	insurance_plan: z.string().max(200, "Plano muito longo").optional(),
	insurance_number: z.string().max(100, "Número muito longo").optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface NewPatientModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export const NewPatientModal: React.FC<NewPatientModalProps> = ({
	open,
	onOpenChange,
}) => {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const [isFetchingAddress, setIsFetchingAddress] = React.useState(false);
	const [activeTab, setActiveTab] = useState<
		"basic" | "medical" | "address" | "additional"
	>("basic");

	const form = useForm<PatientFormData>({
		resolver: zodResolver(patientSchema),
		mode: "onChange",
		defaultValues: {
			name: "",
			email: "",
			phone: "",
			cpf: "",
			birth_date: undefined,
			gender: "masculino",
			session_value: "" as const,
			zip_code: "",
			address: "",
			address_number: "",
			address_complement: "",
			neighborhood: "",
			city: "",
			state: "",
			emergency_contact: "",
			emergency_contact_relationship: "",
			medical_history: "",
			main_condition: "",
			allergies: "",
			medications: "",
			weight_kg: "" as const,
			height_cm: "" as const,
			blood_type: "",
			marital_status: "",
			profession: "",
			education_level: "",
			insurance_plan: "",
			insurance_number: "",
		},
	});

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting, isDirty },
		reset,
		} = form;

	const watchedBirthDate = watch("birth_date");
	const watchedPhone = watch("phone");
	const watchedCpf = watch("cpf");
	const watchedZipCode = watch("zip_code");
	const watchedName = watch("name");
	const watchedMainCondition = watch("main_condition");

	// Handlers para formatação de CPF, telefone e CEP
	const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatCPF(e.target.value);
		setValue("cpf", formatted, { shouldValidate: false });
	};

	const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatPhoneInput(e.target.value);
		setValue("phone", formatted, { shouldValidate: false });
	};

	const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatCEP(e.target.value);
		setValue("zip_code", formatted, { shouldValidate: false });

		if (formatted.replace(/\D/g, "").length === 8) {
			void fetchAddress(formatted.replace(/\D/g, ""));
		}
	};

	const fetchAddress = async (cep: string) => {
		setIsFetchingAddress(true);
		try {
			const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
			const data = await response.json();

			if (data.erro) {
				toast({
					title: "CEP não encontrado",
					description: "Verifique o CEP digitado.",
					variant: "destructive",
				});
				return;
			}

			setValue("address", data.logradouro || "", { shouldValidate: true });
			setValue("neighborhood", data.bairro || "", { shouldValidate: true });
			setValue("city", data.localidade || "", { shouldValidate: true });
			setValue("state", data.uf || "", { shouldValidate: true });

			toast({
				title: "Endereço encontrado!",
				description: "Os campos foram preenchidos automaticamente.",
			});
		} catch (error) {
			logger.error("Erro ao buscar CEP", error, "NewPatientModal");
		} finally {
			setIsFetchingAddress(false);
		}
	};

	const handleSave = async (data: PatientFormData) => {
		try {
			const cleanCpfValue = data.cpf ? cleanCPF(data.cpf) : undefined;
			const cleanPhoneValue = data.phone ? cleanPhone(data.phone) : undefined;
			const cleanEmailValue = data.email
				? sanitizeEmail(data.email)
				: undefined;

			const fullAddress = data.address
				? `${data.address}${data.address_number ? `, ${data.address_number}` : ""}${data.address_complement ? ` - ${data.address_complement}` : ""}${data.neighborhood ? ` - ${data.neighborhood}` : ""}${data.city ? ` - ${data.city}` : ""}${data.state ? ` / ${data.state}` : ""}${data.zip_code ? ` (CEP: ${data.zip_code})` : ""}`
				: null;

			const patientData = {
				name: sanitizeString(data.name, 200),
				full_name: sanitizeString(data.name, 200),
				email: cleanEmailValue || null,
				phone: cleanPhoneValue || null,
				cpf: cleanCpfValue || null,
				birth_date: data.birth_date
					? format(data.birth_date, "yyyy-MM-dd")
					: null,
				gender: data.gender,
				session_value:
					data.session_value && typeof data.session_value === "number"
						? data.session_value
						: null,
				address: fullAddress,
				emergency_contact: data.emergency_contact
					? sanitizeString(data.emergency_contact, 200)
					: null,
				emergency_contact_relationship: data.emergency_contact_relationship
					? sanitizeString(data.emergency_contact_relationship, 100)
					: null,
				medical_history: data.medical_history
					? sanitizeString(data.medical_history, 5000)
					: null,
				main_condition: sanitizeString(data.main_condition, 500),
				allergies: data.allergies ? sanitizeString(data.allergies, 500) : null,
				medications: data.medications
					? sanitizeString(data.medications, 500)
					: null,
				weight_kg:
					data.weight_kg && typeof data.weight_kg === "number"
						? data.weight_kg
						: null,
				height_cm:
					data.height_cm && typeof data.height_cm === "number"
						? data.height_cm
						: null,
				blood_type: data.blood_type || null,
				marital_status: data.marital_status || null,
				profession: data.profession
					? sanitizeString(data.profession, 200)
					: null,
				education_level: data.education_level || null,
				insurance_plan: data.insurance_plan
					? sanitizeString(data.insurance_plan, 200)
					: null,
				insurance_number: data.insurance_number
					? sanitizeString(data.insurance_number, 100)
					: null,
				status: "Inicial",
				progress: 0,
				consent_data: true,
				consent_image: false,
				incomplete_registration: false,
			};

			const patientResponse = await patientsApi.create(patientData);
			const createdPatient = patientResponse.data;

			if (
				createdPatient?.id &&
				(data.medical_history || data.allergies || data.medications)
			) {
				await patientsApi.createMedicalRecord(createdPatient.id, {
					chief_complaint: data.main_condition,
					medical_history: data.medical_history || null,
					current_medications: data.medications || null,
					allergies: data.allergies || null,
					family_history: null,
					lifestyle_habits: null,
					previous_surgeries: null,
					record_date: format(new Date(), "yyyy-MM-dd"),
					created_by: null,
				});
			}

			logger.info(
				"Paciente cadastrado com sucesso",
				{
					name: patientData.name,
					id: createdPatient?.id,
				},
				"NewPatientModal",
			);

			toast({
				title: "Paciente cadastrado!",
				description: "Novo paciente adicionado com sucesso.",
			});

			queryClient.invalidateQueries({ queryKey: ["patients"] });
			reset();
			setActiveTab("basic");
			onOpenChange(false);
		} catch (error: unknown) {
			logger.error("Erro ao cadastrar paciente", error, "NewPatientModal");

			let errorMessage = "Não foi possível cadastrar o paciente.";

			if (error instanceof Error) {
				if (
					error.message.includes("permission-denied") ||
					error.message.includes("insufficient permissions")
				) {
					errorMessage = "Você não tem permissão para cadastrar pacientes.";
				} else if (
					error.message.includes("already exists") ||
					error.message.includes("duplicate key")
				) {
					errorMessage =
						"Já existe um paciente com este CPF ou email cadastrado.";
				} else {
					errorMessage = error.message;
				}
			}

			toast({
				title: "Erro ao cadastrar",
				description: errorMessage,
				variant: "destructive",
			});
		}
	};

	// Calcular progresso do formulário
	const filledFields = [
		watchedName,
		watchedMainCondition,
		watchedPhone,
		watchedCpf,
		watchedBirthDate,
		watch("email"),
		watch("address"),
		watch("emergency_contact"),
	].filter(Boolean).length;

	const progressPercentage = Math.round((filledFields / 8) * 100);

	// Função para navegar entre tabs
	const handleNextTab = () => {
		if (activeTab === "basic") setActiveTab("medical");
		else if (activeTab === "medical") setActiveTab("address");
		else if (activeTab === "address") setActiveTab("additional");
	};

	const handlePrevTab = () => {
		if (activeTab === "additional") setActiveTab("address");
		else if (activeTab === "address") setActiveTab("medical");
		else if (activeTab === "medical") setActiveTab("basic");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 gap-0">
				{/* Header com gradiente */}
				<DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-b">
					<div className="flex items-start gap-4">
						<div className="p-3 bg-gradient-to-br from-primary to-primary/70 rounded-xl shadow-lg shadow-primary/20">
							<UserPlus className="w-6 h-6 text-primary-foreground" />
						</div>
						<div className="flex-1">
							<DialogTitle className="text-xl font-bold">
								Novo Paciente
							</DialogTitle>
							<DialogDescription className="text-muted-foreground mt-1">
								Preencha os dados do paciente para criar o cadastro
							</DialogDescription>
						</div>
						{/* Indicador de progresso */}
						<div className="flex flex-col items-end gap-1">
							<Badge variant="outline" className="text-xs font-medium">
								{progressPercentage}% completo
							</Badge>
							<div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
								<div
									className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300"
									style={{ width: `${progressPercentage}%` }}
								/>
							</div>
						</div>
					</div>
				</DialogHeader>

				{/* Tabs de navegação */}
				<div className="border-b bg-muted/30 px-6 py-2">
					<TabsList className="grid w-full grid-cols-4 h-10 bg-transparent gap-1">
						<TabsTrigger
							value="basic"
							className={cn(
								"data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all",
								"flex items-center gap-2 text-sm",
							)}
							onClick={() => setActiveTab("basic")}
						>
							<User className="w-4 h-4" />
							<span className="hidden sm:inline">Básico</span>
						</TabsTrigger>
						<TabsTrigger
							value="medical"
							className={cn(
								"data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all",
								"flex items-center gap-2 text-sm",
							)}
							onClick={() => setActiveTab("medical")}
						>
							<HeartPulse className="w-4 h-4" />
							<span className="hidden sm:inline">Médico</span>
						</TabsTrigger>
						<TabsTrigger
							value="address"
							className={cn(
								"data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all",
								"flex items-center gap-2 text-sm",
							)}
							onClick={() => setActiveTab("address")}
						>
							<MapPin className="w-4 h-4" />
							<span className="hidden sm:inline">Endereço</span>
						</TabsTrigger>
						<TabsTrigger
							value="additional"
							className={cn(
								"data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all",
								"flex items-center gap-2 text-sm",
							)}
							onClick={() => setActiveTab("additional")}
						>
							<Briefcase className="w-4 h-4" />
							<span className="hidden sm:inline">Adicional</span>
						</TabsTrigger>
					</TabsList>
				</div>

				{/* Conteúdo do formulário */}
				<div className="flex-1 overflow-y-auto px-6 py-4">
					<form
						id="patient-form"
						onSubmit={handleSubmit(handleSave)}
						className="space-y-6"
					>
						<Tabs value={activeTab} className="w-full">
							{/* Tab: Informações Básicas */}
							<TabsContent value="basic" className="space-y-4 mt-0">
								<Card className="border-0 shadow-none">
									<CardHeader className="px-0 pt-0">
										<CardTitle className="flex items-center gap-2 text-base">
											<div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
												<User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
											</div>
											Informações Pessoais
										</CardTitle>
										<CardDescription>
											Dados básicos de identificação do paciente
										</CardDescription>
									</CardHeader>
									<CardContent className="px-0 space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Nome Completo */}
											<div className="space-y-2 md:col-span-2">
												<Label
													htmlFor="name"
													className="flex items-center gap-1"
												>
													Nome Completo{" "}
													<span className="text-destructive">*</span>
												</Label>
												<div className="relative">
													<User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
													<Input
														id="name"
														{...register("name")}
														placeholder="Nome completo do paciente"
														className={cn(
															"pl-10",
															errors.name && "border-destructive",
														)}
														aria-required="true"
													/>
												</div>
												{errors.name && (
													<p className="text-sm text-destructive flex items-center gap-1">
														<AlertCircle className="w-3 h-3" />
														{String(errors.name.message)}
													</p>
												)}
											</div>

											{/* Email */}
											<div className="space-y-2">
												<Label htmlFor="email">Email</Label>
												<div className="relative">
													<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
													<Input
														id="email"
														type="email"
														{...register("email")}
														placeholder="email@exemplo.com"
														className={cn(
															"pl-10",
															errors.email && "border-destructive",
														)}
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
													<Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
													<Input
														id="phone"
														value={watchedPhone || ""}
														onChange={handlePhoneChange}
														placeholder="(11) 99999-9999"
														maxLength={15}
														className={cn(
															"pl-10",
															errors.phone && "border-destructive",
														)}
													/>
												</div>
												{errors.phone && (
													<p className="text-sm text-destructive">
														{errors.phone.message}
													</p>
												)}
											</div>

											{/* CPF */}
											<div className="space-y-2">
												<Label htmlFor="cpf">CPF</Label>
												<div className="relative">
													<IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
													<Input
														id="cpf"
														value={watchedCpf || ""}
														onChange={handleCpfChange}
														placeholder="000.000.000-00"
														maxLength={14}
														className={cn(
															"pl-10",
															errors.cpf && "border-destructive",
														)}
													/>
												</div>
												{errors.cpf && (
													<p className="text-sm text-destructive">
														{errors.cpf.message}
													</p>
												)}
											</div>

											{/* Data de Nascimento */}
											<div className="space-y-2">
												<Label>Data de Nascimento</Label>
												<SmartDatePicker
													date={watchedBirthDate}
													onChange={(date) =>
														setValue("birth_date", date || undefined, {
															shouldValidate: true,
														})
													}
													placeholder="Selecione ou digite"
													fromYear={1920}
													toYear={new Date().getFullYear()}
												/>
											</div>

											{/* Gênero */}
											<div className="space-y-2">
												<Label htmlFor="gender">
													Gênero <span className="text-destructive">*</span>
												</Label>
												<Select
													value={watch("gender")}
													onValueChange={(value) =>
														setValue(
															"gender",
															value as "masculino" | "feminino" | "outro",
														)
													}
												>
													<SelectTrigger
														id="gender"
														className={cn(
															errors.gender && "border-destructive",
														)}
													>
														<SelectValue placeholder="Selecione o gênero" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="masculino">Masculino</SelectItem>
														<SelectItem value="feminino">Feminino</SelectItem>
														<SelectItem value="outro">Outro</SelectItem>
													</SelectContent>
												</Select>
											</div>

											{/* Valor por Sessão */}
											<div className="space-y-2">
												<Label htmlFor="session_value">
													Valor por Sessão (R$)
												</Label>
												<div className="relative">
													<span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
														R$
													</span>
													<Input
														id="session_value"
														type="number"
														step="0.01"
														{...register("session_value", {
															valueAsNumber: true,
														})}
														placeholder="0,00"
														className="pl-10"
													/>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Tab: Informações Médicas */}
							<TabsContent value="medical" className="space-y-4 mt-0">
								<Card className="border-0 shadow-none">
									<CardHeader className="px-0 pt-0">
										<CardTitle className="flex items-center gap-2 text-base">
											<div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
												<HeartPulse className="w-4 h-4 text-red-600 dark:text-red-400" />
											</div>
											Histórico Clínico
										</CardTitle>
										<CardDescription>
											Informações médicas e condições de saúde
										</CardDescription>
									</CardHeader>
									<CardContent className="px-0 space-y-4">
										{/* Condição Principal */}
										<div className="space-y-2">
											<Label
												htmlFor="main_condition"
												className="flex items-center gap-1"
											>
												<Stethoscope className="w-4 h-4 text-muted-foreground" />
												Condição Principal{" "}
												<span className="text-destructive">*</span>
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
														placeholder="Selecione as queixas principais..."
														allowCustom={true}
														className={cn(
															errors.main_condition &&
																"border-destructive ring-destructive/20",
														)}
													/>
												)}
											/>
											{errors.main_condition && (
												<p className="text-sm text-destructive flex items-center gap-1">
													<AlertCircle className="w-3 h-3" />
													{errors.main_condition.message}
												</p>
											)}
										</div>

										{/* Histórico Médico */}
										<div className="space-y-2">
											<Label htmlFor="medical_history">Histórico Médico</Label>
											<Textarea
												id="medical_history"
												{...register("medical_history")}
												placeholder="Descreva o histórico de saúde, cirurgias anteriores, etc."
												rows={3}
												className="resize-none"
											/>
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Alergias */}
											<div className="space-y-2">
												<Label
													htmlFor="allergies"
													className="flex items-center gap-1"
												>
													<AlertCircle className="w-4 h-4 text-muted-foreground" />
													Alergias
												</Label>
												<Input
													id="allergies"
													{...register("allergies")}
													placeholder="Alergias conhecidas"
												/>
											</div>

											{/* Medicamentos */}
											<div className="space-y-2">
												<Label
													htmlFor="medications"
													className="flex items-center gap-1"
												>
													<Pill className="w-4 h-4 text-muted-foreground" />
													Medicamentos
												</Label>
												<Input
													id="medications"
													{...register("medications")}
													placeholder="Medicamentos em uso"
												/>
											</div>
										</div>

										{/* Dados físicos */}
										<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
											<div className="space-y-2">
												<Label
													htmlFor="weight_kg"
													className="flex items-center gap-1"
												>
													<Scale className="w-4 h-4 text-muted-foreground" />
													Peso (kg)
												</Label>
												<Input
													id="weight_kg"
													type="number"
													{...register("weight_kg", { valueAsNumber: true })}
													placeholder="70"
												/>
											</div>
											<div className="space-y-2">
												<Label htmlFor="height_cm">Altura (cm)</Label>
												<Input
													id="height_cm"
													type="number"
													{...register("height_cm", { valueAsNumber: true })}
													placeholder="170"
												/>
											</div>
											<div className="space-y-2">
												<Label
													htmlFor="blood_type"
													className="flex items-center gap-1"
												>
													<Droplet className="w-4 h-4 text-muted-foreground" />
													Tipo Sanguíneo
												</Label>
												<Select
													value={watch("blood_type")}
													onValueChange={(value) =>
														setValue("blood_type", value)
													}
												>
													<SelectTrigger>
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
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Tab: Endereço */}
							<TabsContent value="address" className="space-y-4 mt-0">
								<Card className="border-0 shadow-none">
									<CardHeader className="px-0 pt-0">
										<CardTitle className="flex items-center gap-2 text-base">
											<div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
												<MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
											</div>
											Endereço
										</CardTitle>
										<CardDescription>
											Localização e contato de emergência
										</CardDescription>
									</CardHeader>
									<CardContent className="px-0 space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* CEP */}
											<div className="space-y-2">
												<Label htmlFor="zip_code">CEP</Label>
												<div className="relative">
													<Input
														id="zip_code"
														value={watchedZipCode || ""}
														onChange={handleZipCodeChange}
														placeholder="00000-000"
														maxLength={9}
														className="pr-10"
													/>
													<div className="absolute right-3 top-1/2 -translate-y-1/2">
														{isFetchingAddress ? (
															<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
														) : (
															<Search className="h-4 w-4 text-muted-foreground" />
														)}
													</div>
												</div>
											</div>

											{/* Logradouro */}
											<div className="space-y-2 md:col-span-2">
												<Label
													htmlFor="address"
													className="flex items-center gap-1"
												>
													<Home className="w-4 h-4 text-muted-foreground" />
													Logradouro
												</Label>
												<Input
													id="address"
													{...register("address")}
													placeholder="Nome da rua ou avenida"
												/>
											</div>

											{/* Número */}
											<div className="space-y-2">
												<Label htmlFor="address_number">Número</Label>
												<Input
													id="address_number"
													{...register("address_number")}
													placeholder="Número"
												/>
											</div>

											{/* Complemento */}
											<div className="space-y-2">
												<Label htmlFor="address_complement">Complemento</Label>
												<Input
													id="address_complement"
													{...register("address_complement")}
													placeholder="Apto, Sala, Bloco..."
												/>
											</div>

											{/* Bairro */}
											<div className="space-y-2">
												<Label htmlFor="neighborhood">Bairro</Label>
												<Input
													id="neighborhood"
													{...register("neighborhood")}
													placeholder="Bairro"
												/>
											</div>

											{/* Cidade e UF */}
											<div className="space-y-2">
												<div className="grid grid-cols-3 gap-2">
													<div className="col-span-2 space-y-2">
														<Label
															htmlFor="city"
															className="flex items-center gap-1"
														>
															<Building className="w-4 h-4 text-muted-foreground" />
															Cidade
														</Label>
														<Input
															id="city"
															{...register("city")}
															placeholder="Cidade"
														/>
													</div>
													<div className="space-y-2">
														<Label htmlFor="state">UF</Label>
														<Input
															id="state"
															{...register("state")}
															placeholder="UF"
															maxLength={2}
														/>
													</div>
												</div>
											</div>
										</div>

										{/* Contato de Emergência */}
										<div className="border-t pt-4 mt-4">
											<h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
												<div className="p-1 bg-amber-100 dark:bg-amber-900/30 rounded">
													<Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
												</div>
												Contato de Emergência
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="emergency_contact">
														Nome do Contato
													</Label>
													<Input
														id="emergency_contact"
														{...register("emergency_contact")}
														placeholder="Nome e telefone"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="emergency_contact_relationship">
														Parentesco
													</Label>
													<Input
														id="emergency_contact_relationship"
														{...register("emergency_contact_relationship")}
														placeholder="Ex: Mãe, Pai, Cônjuge"
													/>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>

							{/* Tab: Informações Adicionais */}
							<TabsContent value="additional" className="space-y-4 mt-0">
								<Card className="border-0 shadow-none">
									<CardHeader className="px-0 pt-0">
										<CardTitle className="flex items-center gap-2 text-base">
											<div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
												<Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
											</div>
											Informações Complementares
										</CardTitle>
										<CardDescription>
											Dados profissionais, convênio e escolaridade
										</CardDescription>
									</CardHeader>
									<CardContent className="px-0 space-y-4">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Estado Civil */}
											<div className="space-y-2">
												<Label
													htmlFor="marital_status"
													className="flex items-center gap-1"
												>
													<Heart className="w-4 h-4 text-muted-foreground" />
													Estado Civil
												</Label>
												<Select
													value={watch("marital_status")}
													onValueChange={(value) =>
														setValue("marital_status", value)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="solteiro">
															Solteiro(a)
														</SelectItem>
														<SelectItem value="casado">Casado(a)</SelectItem>
														<SelectItem value="divorciado">
															Divorciado(a)
														</SelectItem>
														<SelectItem value="viuvo">Viúvo(a)</SelectItem>
														<SelectItem value="uniao_estavel">
															União Estável
														</SelectItem>
													</SelectContent>
												</Select>
											</div>

											{/* Profissão */}
											<div className="space-y-2">
												<Label
													htmlFor="profession"
													className="flex items-center gap-1"
												>
													<Briefcase className="w-4 h-4 text-muted-foreground" />
													Profissão
												</Label>
												<Input
													id="profession"
													{...register("profession")}
													placeholder="Profissão"
												/>
											</div>

											{/* Escolaridade */}
											<div className="space-y-2">
												<Label
													htmlFor="education_level"
													className="flex items-center gap-1"
												>
													<GraduationCap className="w-4 h-4 text-muted-foreground" />
													Escolaridade
												</Label>
												<Select
													value={watch("education_level")}
													onValueChange={(value) =>
														setValue("education_level", value)
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="fundamental">
															Ensino Fundamental
														</SelectItem>
														<SelectItem value="medio">Ensino Médio</SelectItem>
														<SelectItem value="superior">
															Ensino Superior
														</SelectItem>
														<SelectItem value="pos">Pós-graduação</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</div>

										{/* Convênio */}
										<div className="border-t pt-4 mt-2">
											<h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
												<div className="p-1 bg-cyan-100 dark:bg-cyan-900/30 rounded">
													<CreditCard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
												</div>
												Convênio Médico
											</h4>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												<div className="space-y-2">
													<Label htmlFor="insurance_plan">Plano de Saúde</Label>
													<Input
														id="insurance_plan"
														{...register("insurance_plan")}
														placeholder="Nome do plano"
													/>
												</div>
												<div className="space-y-2">
													<Label htmlFor="insurance_number">
														Número da Carteira
													</Label>
													<Input
														id="insurance_number"
														{...register("insurance_number")}
														placeholder="Número da carteira do plano"
													/>
												</div>
											</div>
										</div>
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</form>
				</div>

				{/* Footer com navegação e ações */}
				<div className="border-t bg-muted/30 p-4 flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						{activeTab !== "basic" && (
							<Button
								type="button"
								variant="ghost"
								onClick={handlePrevTab}
								disabled={isSubmitting}
								className="text-muted-foreground"
							>
								Anterior
							</Button>
						)}
					</div>

					<div className="flex items-center gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								reset();
								setActiveTab("basic");
								onOpenChange(false);
							}}
							disabled={isSubmitting}
						>
							Cancelar
						</Button>

						{activeTab !== "additional" ? (
							<Button
								type="button"
								onClick={handleNextTab}
								className="bg-primary hover:bg-primary/90 gap-2"
							>
								Próximo
							</Button>
						) : (
							<Button
								type="submit"
								form="patient-form"
								disabled={isSubmitting || !watchedName || !watchedMainCondition}
								className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 gap-2 min-w-[160px] transition-all hover:scale-[1.02] active:scale-[0.98]"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Salvando...
									</>
								) : (
									<>
										<CheckCircle2 className="w-4 h-4" />
										Cadastrar Paciente
									</>
								)}
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default NewPatientModal;
