import React from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
	Loader2,
	User2,
	Phone,
	Mail,
	Building2,
	FileText,
	Stethoscope,
	MapPin,
	Hash,
	Briefcase,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Doctor, DoctorFormData } from "@/types/doctor";
import { useCreateDoctor, useUpdateDoctor } from "@/hooks/useDoctors";

const formSchema = z.object({
	name: z.string().min(2, "Nome é obrigatório"),
	specialty: z.string().optional(),
	crm: z.string().optional(),
	crm_state: z.string().max(2, "Use a sigla do estado (ex: SP)").optional(),
	phone: z.string().optional(),
	email: z.string().email("Email inválido").optional().or(z.literal("")),
	clinic_name: z.string().optional(),
	clinic_address: z.string().optional(),
	clinic_phone: z.string().optional(),
	notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DoctorFormModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	doctor?: Doctor | null;
	onSuccess?: (doctor: Doctor) => void;
	suggestedName?: string;
}

export function DoctorFormModal({
	open,
	onOpenChange,
	doctor,
	onSuccess,
	suggestedName,
}: DoctorFormModalProps) {
	const isEditing = !!doctor;
	const createMutation = useCreateDoctor();
	const updateMutation = useUpdateDoctor();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: doctor?.name || suggestedName || "",
			specialty: doctor?.specialty || "",
			crm: doctor?.crm || "",
			crm_state: doctor?.crm_state || "",
			phone: doctor?.phone || "",
			email: doctor?.email || "",
			clinic_name: doctor?.clinic_name || "",
			clinic_address: doctor?.clinic_address || "",
			clinic_phone: doctor?.clinic_phone || "",
			notes: doctor?.notes || "",
		},
	});

	React.useEffect(() => {
		if (open && doctor) {
			form.reset({
				name: doctor.name || "",
				specialty: doctor.specialty || "",
				crm: doctor.crm || "",
				crm_state: doctor.crm_state || "",
				phone: doctor.phone || "",
				email: doctor.email || "",
				clinic_name: doctor.clinic_name || "",
				clinic_address: doctor.clinic_address || "",
				clinic_phone: doctor.clinic_phone || "",
				notes: doctor.notes || "",
			});
		} else if (open && !doctor) {
			form.reset({
				name: suggestedName || "",
				specialty: "",
				crm: "",
				crm_state: "",
				phone: "",
				email: "",
				clinic_name: "",
				clinic_address: "",
				clinic_phone: "",
				notes: "",
			});
		}
	}, [open, doctor, form, suggestedName]);

	const onSubmit = async (values: FormValues) => {
		const data: DoctorFormData = {
			name: values.name,
			specialty: values.specialty || undefined,
			crm: values.crm || undefined,
			crm_state: values.crm_state || undefined,
			phone: values.phone || undefined,
			email: values.email || undefined,
			clinic_name: values.clinic_name || undefined,
			clinic_address: values.clinic_address || undefined,
			clinic_phone: values.clinic_phone || undefined,
			notes: values.notes || undefined,
		};

		if (isEditing) {
			updateMutation.mutate(
				{ id: doctor.id, data },
				{
					onSuccess: (savedDoctor) => {
						onOpenChange(false);
						onSuccess?.(savedDoctor);
					},
				},
			);
		} else {
			createMutation.mutate(data, {
				onSuccess: (createdDoctor) => {
					onOpenChange(false);
					onSuccess?.(createdDoctor);
				},
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 overflow-hidden border-none shadow-2xl">
				<DialogHeader className="p-6 pb-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white dark:from-blue-900 dark:to-slate-900">
					<div className="flex items-center gap-3">
						<div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm ring-1 ring-white/30">
							<Stethoscope className="h-6 w-6 text-white" />
						</div>
						<div>
							<DialogTitle className="text-xl font-bold tracking-tight text-white">
								{isEditing ? "Editar Médico" : "Cadastrar Novo Médico"}
							</DialogTitle>
							<DialogDescription className="text-blue-100/90 font-medium">
								{isEditing
									? "Atualize as informações do médico"
									: "Gerencie sua rede de parceiros e indicações."}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="p-6 space-y-8 bg-background"
					>
						{/* Basic Information Section */}
						<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
							<div className="flex items-center gap-2 pb-1 border-b border-border/50">
								<div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
									<User2 className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									Informações Básicas
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-6 gap-5">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="md:col-span-6">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80 flex items-center gap-1.5">
												Nome Completo{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<User2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="Dr(a). Nome Completo"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="specialty"
									render={({ field }) => (
										<FormItem className="md:col-span-3">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												Especialidade
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="Ex: Ortopedista"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="crm"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												CRM
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<Hash className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="123456"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="crm_state"
									render={({ field }) => (
										<FormItem className="md:col-span-1">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												UF
											</FormLabel>
											<FormControl>
												<Input
													placeholder="SP"
													maxLength={2}
													className="h-11 text-center font-semibold border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all uppercase shadow-sm"
													{...field}
												/>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Contact Information Section */}
						<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75">
							<div className="flex items-center gap-2 pb-1 border-b border-border/50">
								<div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
									<Phone className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									Contato Direto
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<FormField
									control={form.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												WhatsApp / Telefone
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="(11) 99999-9999"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												E-mail
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														type="email"
														placeholder="medico@exemplo.com"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Clinic Information Section */}
						<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
							<div className="flex items-center gap-2 pb-1 border-b border-border/50">
								<div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
									<Building2 className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									Vínculo com Clínica
								</h3>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<FormField
									control={form.control}
									name="clinic_name"
									render={({ field }) => (
										<FormItem className="md:col-span-1">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												Nome da Clínica
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="Nome da instituição"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="clinic_phone"
									render={({ field }) => (
										<FormItem className="md:col-span-1">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												Telefone Clínica
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="(11) 3333-3333"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="clinic_address"
									render={({ field }) => (
										<FormItem className="md:col-span-2">
											<FormLabel className="text-xs font-bold uppercase text-muted-foreground/80">
												Endereço Profissional
											</FormLabel>
											<FormControl>
												<div className="relative group">
													<MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-blue-500" />
													<Input
														placeholder="Rua, número, bairro, cidade"
														className="pl-10 h-11 border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all shadow-sm"
														{...field}
													/>
												</div>
											</FormControl>
											<FormMessage className="text-xs font-medium" />
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Notes Section */}
						<div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
							<div className="flex items-center gap-2 pb-1 border-b border-border/50">
								<div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
									<FileText className="h-4 w-4" />
								</div>
								<h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
									Observações Internas
								</h3>
							</div>

							<FormField
								control={form.control}
								name="notes"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Textarea
												placeholder="Adicione informações que ajudem na identificação ou parceria com este médico..."
												className="min-h-[100px] border-border/60 bg-muted/5 focus-visible:ring-blue-500/30 focus-visible:border-blue-500 transition-all resize-none shadow-sm"
												{...field}
											/>
										</FormControl>
										<FormDescription className="text-[11px] font-medium text-muted-foreground italic flex items-center gap-1 mt-1.5">
											<FileText className="h-3 w-3" /> Essas informações são
											visíveis apenas para sua equipe.
										</FormDescription>
										<FormMessage className="text-xs font-medium" />
									</FormItem>
								)}
							/>
						</div>

						<DialogFooter className="pt-4 border-t border-border/50 flex items-center gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								disabled={isPending}
								className="font-semibold text-muted-foreground hover:bg-muted/50"
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={isPending}
								className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
							>
								{isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : isEditing ? (
									"Salvar Alterações"
								) : (
									"Cadastrar Médico"
								)}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
