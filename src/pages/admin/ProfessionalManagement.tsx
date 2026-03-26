import { useState } from "react";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layout/MainLayout";
import {
	Card,
	CardContent,
	CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Search,
	UserPlus,
	Shield,
	MoreVertical,
	Edit,
	CheckCircle2,
	XCircle,
	Stethoscope,
	GraduationCap,
	Briefcase,
	DollarSign,
	UserCheck,
} from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationMembersApi, invitationsApi } from "@/api/v2/system";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const roleLabels: Record<string, { label: string; icon: any; color: string }> =
	{
		admin: {
			label: "Administrador",
			icon: Shield,
			color: "text-purple-600 bg-purple-50",
		},
		fisioterapeuta: {
			label: "Fisioterapeuta",
			icon: Stethoscope,
			color: "text-emerald-600 bg-emerald-50",
		},
		estagiario: {
			label: "Estagiário",
			icon: GraduationCap,
			color: "text-blue-600 bg-blue-50",
		},
		recepcionista: {
			label: "Secretária",
			icon: Briefcase,
			color: "text-amber-600 bg-amber-50",
		},
		financeiro: {
			label: "Financeiro",
			icon: DollarSign,
			color: "text-cyan-600 bg-cyan-50",
		},
	};

export default function ProfessionalManagement() {
	const { profile } = useAuth();
	const organizationId = profile?.organization_id;
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<any>(null);

	const { data: members = [], isLoading } = useQuery({
		queryKey: ["org-members", organizationId],
		queryFn: async () => {
			const res = await organizationMembersApi.list({ organizationId });
			return res.data || [];
		},
		enabled: !!organizationId,
	});

	const updateMemberMutation = useMutation({
		mutationFn: async ({ id, data }: { id: string; data: any }) => {
			return organizationMembersApi.update(id, data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-members"] });
			toast.success("Perfil atualizado com sucesso");
			setIsEditOpen(false);
		},
	});

	const inviteMutation = useMutation({
		mutationFn: async (data: { email: string; role: string }) => {
			return invitationsApi.create(data);
		},
		onSuccess: () => {
			toast.success("Convite enviado com sucesso");
			setIsInviteOpen(false);
		},
	});

	const filteredMembers = members.filter(
		(m) =>
			m.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			m.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const handleEditRole = (member: any) => {
		setSelectedMember(member);
		setIsEditOpen(true);
	};

	return (
		<MainLayout>
			<div className="p-6 max-w-7xl mx-auto space-y-6">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<div>
						<h1 className="text-3xl font-black tracking-tighter">
							Equipe & Profissionais
						</h1>
						<p className="text-muted-foreground mt-1">
							Gerencie os acessos e cargos da sua clínica
						</p>
					</div>
					<Button
						onClick={() => setIsInviteOpen(true)}
						className="rounded-xl shadow-premium-sm gap-2"
					>
						<UserPlus className="h-4 w-4" />
						Convidar Membro
					</Button>
				</div>

				<Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white dark:bg-slate-900">
					<CardHeader className="p-6 border-b border-slate-50 dark:border-slate-800/50">
						<div className="relative max-w-md">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
							<Input
								placeholder="Buscar por nome ou e-mail..."
								className="pl-10 rounded-xl border-none bg-slate-50 dark:bg-slate-800 font-bold text-xs h-11"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
								<TableRow className="border-none">
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										Profissional
									</TableHead>
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										Cargo / Permissão
									</TableHead>
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">
										CREFITO
									</TableHead>
									<TableHead className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-center">
										Status
									</TableHead>
									<TableHead className="px-6 py-4 text-right font-black text-[10px] uppercase tracking-widest w-20">
										Ações
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center py-20 animate-pulse font-bold text-xs uppercase text-slate-400"
										>
											Carregando equipe...
										</TableCell>
									</TableRow>
								) : filteredMembers.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={5}
											className="text-center py-20 font-bold text-xs uppercase text-slate-400"
										>
											Nenhum membro encontrado
										</TableCell>
									</TableRow>
								) : (
									filteredMembers.map((member) => {
										const role = roleLabels[member.role] || {
											label: member.role,
											icon: UserCheck,
											color: "bg-slate-50",
										};
										const RoleIcon = role.icon;
										return (
											<TableRow
												key={member.id}
												className="border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all"
											>
												<TableCell className="px-6 py-4">
													<div className="flex items-center gap-3">
														<div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400">
															{member.user?.full_name?.[0] ||
																member.user?.email?.[0]?.toUpperCase()}
														</div>
														<div>
															<p className="font-bold text-slate-900 dark:text-white leading-none">
																{member.user?.full_name || "Convite Pendente"}
															</p>
															<p className="text-[10px] text-slate-400 mt-1 font-mono">
																{member.user?.email}
															</p>
														</div>
													</div>
												</TableCell>
												<TableCell className="px-6 py-4">
													<Badge
														variant="outline"
														className={cn(
															"rounded-lg border-none font-bold text-[10px] uppercase tracking-wider gap-1.5 py-1 px-2.5",
															role.color,
														)}
													>
														<RoleIcon className="h-3 w-3" />
														{role.label}
													</Badge>
												</TableCell>
												<TableCell className="px-6 py-4">
													{member.user?.crefito ? (
														<span className="text-xs font-black font-mono text-slate-600 dark:text-slate-400">
															{member.user.crefito}
														</span>
													) : member.role === "fisioterapeuta" ? (
														<Badge
															variant="outline"
															className="text-red-500 border-red-100 text-[9px] font-black uppercase"
														>
															Pendente
														</Badge>
													) : (
														<span className="text-slate-300">-</span>
													)}
												</TableCell>
												<TableCell className="px-6 py-4 text-center">
													{member.active ? (
														<div className="flex items-center justify-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase tracking-widest">
															<CheckCircle2 className="h-3.5 w-3.5" />
															Ativo
														</div>
													) : (
														<div className="flex items-center justify-center gap-1.5 text-slate-400 font-black text-[9px] uppercase tracking-widest">
															<XCircle className="h-3.5 w-3.5" />
															Inativo
														</div>
													)}
												</TableCell>
												<TableCell className="px-6 py-4 text-right">
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="h-8 w-8 rounded-lg"
															>
																<MoreVertical className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent
															align="end"
															className="rounded-xl"
														>
															<DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest opacity-50">
																Gerenciar Membro
															</DropdownMenuLabel>
															<DropdownMenuItem
																onClick={() => handleEditRole(member)}
																className="gap-2 font-bold text-xs"
															>
																<Edit className="h-3.5 w-3.5" /> Editar Cargo
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															{member.active ? (
																<DropdownMenuItem
																	onClick={() =>
																		updateMemberMutation.mutate({
																			id: member.id,
																			data: { active: false },
																		})
																	}
																	className="gap-2 font-bold text-xs text-red-500"
																>
																	<XCircle className="h-3.5 w-3.5" /> Desativar
																	Acesso
																</DropdownMenuItem>
															) : (
																<DropdownMenuItem
																	onClick={() =>
																		updateMemberMutation.mutate({
																			id: member.id,
																			data: { active: true },
																		})
																	}
																	className="gap-2 font-bold text-xs text-emerald-600"
																>
																	<CheckCircle2 className="h-3.5 w-3.5" />{" "}
																	Reativar Acesso
																</DropdownMenuItem>
															)}
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				{/* Modal de Convite */}
				<Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
					<DialogContent className="rounded-2xl sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="text-xl font-black tracking-tighter">
								Convidar Profissional
							</DialogTitle>
						</DialogHeader>
						<form
							onSubmit={(e) => {
								e.preventDefault();
								const formData = new FormData(e.currentTarget);
								inviteMutation.mutate({
									email: formData.get("email") as string,
									role: formData.get("role") as string,
								});
							}}
							className="space-y-4 pt-4"
						>
							<div className="space-y-2">
								<Label className="text-[10px] font-black uppercase text-slate-400">
									E-mail do Profissional
								</Label>
								<Input
									name="email"
									type="email"
									placeholder="email@exemplo.com"
									className="rounded-xl h-11"
									required
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-[10px] font-black uppercase text-slate-400">
									Cargo de Acesso
								</Label>
								<Select name="role" defaultValue="fisioterapeuta">
									<SelectTrigger className="rounded-xl h-11">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="fisioterapeuta">
											Fisioterapeuta
										</SelectItem>
										<SelectItem value="estagiario">Estagiário</SelectItem>
										<SelectItem value="recepcionista">Secretária</SelectItem>
										<SelectItem value="financeiro">Financeiro</SelectItem>
										<SelectItem value="admin">Administrador</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<DialogFooter className="pt-4">
								<Button
									type="button"
									variant="ghost"
									onClick={() => setIsInviteOpen(false)}
									className="rounded-xl"
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									disabled={inviteMutation.isPending}
									className="rounded-xl bg-slate-900 text-white"
								>
									Enviar Convite
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>

				{/* Modal de Edição de Cargo */}
				<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
					<DialogContent className="rounded-2xl sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="text-xl font-black tracking-tighter">
								Alterar Cargo
							</DialogTitle>
						</DialogHeader>
						<div className="space-y-4 pt-4">
							<div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
								<p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
									Membro
								</p>
								<p className="font-bold">
									{selectedMember?.user?.full_name ||
										selectedMember?.user?.email}
								</p>
							</div>
							<div className="space-y-2">
								<Label className="text-[10px] font-black uppercase text-slate-400">
									Novo Cargo
								</Label>
								<Select
									defaultValue={selectedMember?.role}
									onValueChange={(v) =>
										updateMemberMutation.mutate({
											id: selectedMember.id,
											data: { role: v },
										})
									}
								>
									<SelectTrigger className="rounded-xl h-11">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="rounded-xl">
										<SelectItem value="fisioterapeuta">
											Fisioterapeuta
										</SelectItem>
										<SelectItem value="estagiario">Estagiário</SelectItem>
										<SelectItem value="recepcionista">Secretária</SelectItem>
										<SelectItem value="financeiro">Financeiro</SelectItem>
										<SelectItem value="admin">Administrador</SelectItem>
									</SelectContent>
								</Select>
							</div>
							{selectedMember?.role === "fisioterapeuta" &&
								!selectedMember?.user?.crefito && (
									<div className="p-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex gap-2 items-start">
										<AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
										<p className="text-[10px] font-bold leading-tight">
											Este profissional ainda não preencheu o número do CREFITO
											no perfil dele. Peça para que ele atualize os dados
											cadastrais.
										</p>
									</div>
								)}
						</div>
						<DialogFooter className="pt-4">
							<Button
								onClick={() => setIsEditOpen(false)}
								className="rounded-xl w-full bg-slate-900 text-white"
							>
								Concluir
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</MainLayout>
	);
}

function AlertTriangle(props: any) {
	return (
		<svg
			{...props}
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
			<path d="M12 9v4" />
			<path d="M12 17h.01" />
		</svg>
	);
}
