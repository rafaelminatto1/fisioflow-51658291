import { format as formatDateFns, isValid, parseISO } from "date-fns";
import {
	Bell,
	Building2,
	Calendar,
	Camera,
	Clock,
	Contrast,
	Edit,
	Loader2,
	Mail,
	MapPin,
	Phone,
	Save,
	Settings,
	Shield,
	User,
} from "lucide-react";
import React, { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { profileApi } from "@/api/v2/system";
import { MainLayout } from "@/components/layout/MainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartDatePicker } from "@/components/ui/smart-date-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

import { SecurityTab } from "@/components/settings/tabs/SecurityTab";
import { ScheduleTab } from "@/components/settings/tabs/ScheduleTab";
import { AccessibilityTab } from "@/components/settings/tabs/AccessibilityTab";
import { OrganizationTab } from "@/components/settings/tabs/OrganizationTab";
import { useSettingsState } from "@/hooks/settings/useSettingsState";

const NotificationPreferences = lazy(() =>
	import("@/components/notifications/NotificationPreferences").then((m) => ({
		default: m.NotificationPreferences,
	})),
);
const NotificationHistory = lazy(() =>
	import("@/components/notifications/NotificationHistory").then((m) => ({
		default: m.NotificationHistory,
	})),
);

const TAB_LIST = [
	{ value: "perfil", label: "Perfil", icon: User },
	{ value: "notifications", label: "Notificações", icon: Bell },
	{ value: "security", label: "Segurança", icon: Shield },
	{ value: "agenda", label: "Agenda", icon: Clock },
	{ value: "appearance", label: "Aparência", icon: Contrast },
] as const;

const ADMIN_TAB = {
	value: "clinic",
	label: "Clínica",
	icon: Building2,
} as const;

function ProfileContent() {
	const queryClient = useQueryClient();
	const { user, updateProfile: updateAuthProfile } = useAuth();
	const { isAdmin } = usePermissions();

	const { data: profileRes, isLoading } = useQuery({
		queryKey: ["profile-me"],
		queryFn: () => profileApi.me(),
		staleTime: 1000 * 60 * 5,
	});

	const profile = profileRes?.data as Record<string, string> | undefined;

	const [isEditing, setIsEditing] = useState(false);
	const [form, setForm] = useState({
		full_name: "",
		email: "",
		phone: "",
		crefito: "",
		specialty: "",
		bio: "",
		address: "",
		birthDate: "",
		avatar: "",
		slug: "",
	});

	useEffect(() => {
		if (profile) {
			setForm({
				full_name: String(profile.full_name ?? profile.name ?? ""),
				email: String(profile.email ?? user?.email ?? ""),
				phone: String(profile.phone ?? profile.telefone ?? ""),
				crefito: String(profile.crefito ?? profile.crefito_number ?? ""),
				specialty: String(profile.specialty ?? profile.especialidade ?? ""),
				bio: String(profile.bio ?? ""),
				address: String(profile.address ?? ""),
				birthDate: String(profile.birth_date ?? profile.birthDate ?? ""),
				avatar: String(profile.avatar_url ?? ""),
				slug: String(profile.slug ?? ""),
			});
		}
	}, [profile, user]);

	const mutation = useMutation({
		mutationFn: () =>
			profileApi.updateMe({
				full_name: form.full_name,
				email: form.email,
				phone: form.phone,
				crefito: form.crefito,
				specialty: form.specialty,
				bio: form.bio,
				address: form.address,
				birth_date: form.birthDate || null,
				slug: form.slug || null,
				updated_at: new Date().toISOString(),
			}),
		onSuccess: () => {
			toast.success("Perfil atualizado com sucesso!");
			setIsEditing(false);
			updateAuthProfile({ full_name: form.full_name });
			queryClient.invalidateQueries({ queryKey: ["profile-me"] });
			queryClient.invalidateQueries({ queryKey: ["user-profile"] });
		},
		onError: () => {
			toast.error("Erro ao salvar perfil. Tente novamente.");
		},
	});

	const handleChange =
		(field: string) =>
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
			setForm((prev) => ({ ...prev, [field]: e.target.value }));
		};

	const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setForm((prev) => ({
			...prev,
			slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
		}));
	};

	const getInitials = (name: string) =>
		name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.substring(0, 2)
			.toUpperCase();

	if (isLoading) {
		return (
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card>
					<CardContent className="p-6 flex flex-col items-center gap-4">
						<Skeleton className="w-32 h-32 rounded-full" />
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-24" />
					</CardContent>
				</Card>
				<Card className="lg:col-span-2">
					<CardContent className="p-6 space-y-4">
						{["name", "email", "phone", "crefito", "specialty", "slug"].map(
							(field) => (
								<div key={field} className="space-y-1.5">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-9 w-full" />
								</div>
							),
						)}
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<Card className="lg:col-span-1 h-fit">
				<CardHeader>
					<CardTitle>Foto do Perfil</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex flex-col items-center space-y-4">
						<div className="relative">
							<Avatar className="w-32 h-32">
								<AvatarImage src={form.avatar} />
								<AvatarFallback className="text-2xl bg-primary/10 text-primary">
									{getInitials(form.full_name)}
								</AvatarFallback>
							</Avatar>
							{isEditing && (
								<Button
									size="sm"
									className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
								>
									<Camera className="w-4 h-4" />
								</Button>
							)}
						</div>
						<div className="text-center">
							<h3 className="font-semibold text-lg">{form.full_name}</h3>
							<p className="text-muted-foreground text-sm">{form.specialty}</p>
							{form.crefito && (
								<Badge className="mt-2">CREFITO: {form.crefito}</Badge>
							)}
						</div>
					</div>

					<Separator />

					<div className="grid grid-cols-3 gap-3">
						<div className="text-center p-3 bg-muted/50 rounded-lg">
							<p className="text-xl font-bold text-primary">156</p>
							<p className="text-xs text-muted-foreground">Pacientes</p>
						</div>
						<div className="text-center p-3 bg-muted/50 rounded-lg">
							<p className="text-xl font-bold text-secondary">342</p>
							<p className="text-xs text-muted-foreground">Sessões</p>
						</div>
						<div className="text-center p-3 bg-muted/50 rounded-lg">
							<p className="text-xl font-bold text-accent">98%</p>
							<p className="text-xs text-muted-foreground">Satisfação</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="lg:col-span-2">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Informações Pessoais</CardTitle>
						<Button
							onClick={() => setIsEditing(!isEditing)}
							variant={isEditing ? "outline" : "default"}
							size="sm"
							data-testid="edit-profile-button"
						>
							<Edit className="w-4 h-4 mr-2" />
							{isEditing ? "Cancelar" : "Editar"}
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="name">Nome Completo</Label>
							<Input
								id="name"
								data-testid="profile-name"
								value={form.full_name}
								onChange={handleChange("full_name")}
								disabled={!isEditing}
								placeholder="Seu nome completo"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="email">E-mail</Label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
								<Input
									id="email"
									type="email"
									value={form.email}
									onChange={handleChange("email")}
									disabled={!isEditing}
									className="pl-10"
									placeholder="seu@email.com.br"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="phone">Telefone</Label>
							<div className="relative">
								<Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
								<Input
									id="phone"
									value={form.phone}
									onChange={handleChange("phone")}
									disabled={!isEditing}
									className="pl-10"
									placeholder="(11) 99999-9999"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="birthDate">Data de Nascimento</Label>
							<SmartDatePicker
								date={form.birthDate ? parseISO(form.birthDate) : undefined}
								onChange={(date) => {
									if (date && isValid(date)) {
										setForm((p) => ({
											...p,
											birthDate: formatDateFns(date, "yyyy-MM-dd"),
										}));
									} else {
										setForm((p) => ({ ...p, birthDate: "" }));
									}
								}}
								disabled={!isEditing}
								fromYear={1900}
								toYear={new Date().getFullYear()}
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="address">Endereço</Label>
						<div className="relative">
							<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
							<Input
								id="address"
								value={form.address}
								onChange={handleChange("address")}
								disabled={!isEditing}
								className="pl-10"
								placeholder="Rua, número, bairro, cidade - UF"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="bio">Biografia</Label>
						<Textarea
							id="bio"
							value={form.bio}
							onChange={handleChange("bio")}
							disabled={!isEditing}
							rows={3}
							placeholder="Conte um pouco sobre sua experiência profissional..."
						/>
					</div>

					<Separator />

					<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						Informações Profissionais
					</h3>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="crefito">CREFITO</Label>
							<Input
								id="crefito"
								value={form.crefito}
								onChange={handleChange("crefito")}
								disabled={!isEditing}
								placeholder="12345/F"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="specialty">Especialidade</Label>
							<Input
								id="specialty"
								value={form.specialty}
								onChange={handleChange("specialty")}
								disabled={!isEditing}
								placeholder="Ex: Ortopedia e Traumatologia"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="slug">Link Público de Agendamento</Label>
						<div className="flex gap-2 items-center">
							<span className="text-sm text-muted-foreground whitespace-nowrap">
								moocafisio.com.br/agendar/
							</span>
							<Input
								id="slug"
								name="slug"
								autoComplete="off"
								value={form.slug}
								onChange={handleSlugChange}
								disabled={!isEditing}
								placeholder="seu-nome"
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							URL única para seus pacientes agendarem horários.
						</p>
					</div>

					{isEditing && (
						<div className="flex justify-end gap-3 pt-4 border-t">
							<Button variant="outline" onClick={() => setIsEditing(false)}>
								Cancelar
							</Button>
							<Button
								onClick={() => mutation.mutate()}
								disabled={mutation.isPending}
								className="bg-primary hover:bg-primary/90"
							>
								{mutation.isPending ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Save className="w-4 h-4 mr-2" />
								)}
								{mutation.isPending ? "Salvando..." : "Salvar Alterações"}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

export const Profile = () => {
	const state = useSettingsState();
	const navigate = useNavigate();
	const { isAdmin } = usePermissions();

	const allTabs = isAdmin
		? [...TAB_LIST.slice(0, 3), ADMIN_TAB, ...TAB_LIST.slice(3)]
		: TAB_LIST;

	const colCount = isAdmin ? 6 : 5;

	return (
		<MainLayout>
			<div className="space-y-6 animate-fade-in">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
							<User className="w-6 h-6" />
							Meu Perfil
						</h1>
						<p className="text-muted-foreground text-sm">
							Gerencie suas informações, preferências e configurações
						</p>
					</div>
				</div>

				<Tabs
					value={state.activeTab}
					onValueChange={state.handleTabChange}
					className="space-y-6"
				>
					<TabsList className={`grid w-full grid-cols-${colCount} h-10`}>
						{allTabs.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="flex items-center gap-1.5 text-xs"
							>
								<tab.icon className="w-4 h-4" />
								<span className="hidden sm:inline">{tab.label}</span>
							</TabsTrigger>
						))}
					</TabsList>

					<TabsContent value="perfil" className="space-y-6">
						<ProfileContent />
					</TabsContent>

					<TabsContent value="notifications" className="space-y-6">
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							<Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
								<NotificationPreferences />
							</Suspense>
							<Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
								<NotificationHistory />
							</Suspense>
						</div>
					</TabsContent>

					<TabsContent value="security" className="space-y-6">
						<SecurityTab
							isAdmin={state.isAdmin}
							user={state.user}
							mfa={state.mfa}
							password={state.password}
							navigate={navigate}
							onInvite={() => state.setInviteModalOpen(true)}
						/>
					</TabsContent>

					{isAdmin && (
						<TabsContent value="clinic" className="space-y-6">
							<OrganizationTab />
						</TabsContent>
					)}

					<TabsContent value="agenda" className="space-y-6">
						<ScheduleTab />
					</TabsContent>

					<TabsContent value="appearance" className="space-y-6">
						<AccessibilityTab />
					</TabsContent>
				</Tabs>
			</div>
		</MainLayout>
	);
};
