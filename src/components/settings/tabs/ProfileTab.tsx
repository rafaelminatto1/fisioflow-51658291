import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/api/v2/system";
import { toast } from "sonner";

export function ProfileTab() {
	const queryClient = useQueryClient();

	const { data: profileRes, isLoading } = useQuery({
		queryKey: ["profile-me"],
		queryFn: () => profileApi.me(),
		staleTime: 1000 * 60 * 5,
	});

	const profile = profileRes?.data as Record<string, string> | undefined;

	const [form, setForm] = useState({
		full_name: "",
		email: "",
		phone: "",
		crefito: "",
		specialty: "",
	});

	useEffect(() => {
		if (profile) {
			setForm({
				full_name: String(profile.full_name ?? profile.name ?? ""),
				email: String(profile.email ?? ""),
				phone: String(profile.phone ?? profile.telefone ?? ""),
				crefito: String(profile.crefito ?? profile.crefito_number ?? ""),
				specialty: String(profile.specialty ?? profile.especialidade ?? ""),
			});
		}
	}, [profile]);

	const mutation = useMutation({
		mutationFn: () =>
			profileApi.updateMe({
				full_name: form.full_name,
				email: form.email,
				phone: form.phone,
				crefito: form.crefito,
				specialty: form.specialty,
				updated_at: new Date().toISOString(),
			}),
		onSuccess: () => {
			toast.success("Perfil atualizado com sucesso!");
			queryClient.invalidateQueries({ queryKey: ["profile-me"] });
			queryClient.invalidateQueries({ queryKey: ["user-profile"] });
		},
		onError: () => {
			toast.error("Erro ao salvar perfil. Tente novamente.");
		},
	});

	const handleChange =
		(field: keyof typeof form) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setForm((prev) => ({ ...prev, [field]: e.target.value }));
		};

	if (isLoading) {
		return (
			<Card className="bg-gradient-card border-border shadow-card">
				<CardHeader className="border-b border-border p-3 sm:p-4">
					<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
						<User className="w-4 h-4 sm:w-5 sm:h-5" />
						Perfil
					</CardTitle>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 lg:p-6 space-y-4">
					{[1, 2, 3, 4].map((i) => (
						<div key={i} className="space-y-1.5">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-9 w-full" />
						</div>
					))}
					<Skeleton className="h-10 w-full" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-gradient-card border-border shadow-card">
			<CardHeader className="border-b border-border p-3 sm:p-4">
				<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
					<User className="w-4 h-4 sm:w-5 sm:h-5" />
					Perfil
				</CardTitle>
			</CardHeader>
			<CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="name" className="text-xs sm:text-sm">
						Nome completo
					</Label>
					<Input
						id="name"
						value={form.full_name}
						onChange={handleChange("full_name")}
						placeholder="Seu nome completo"
						className="text-sm"
					/>
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="email" className="text-xs sm:text-sm">
						E-mail
					</Label>
					<Input
						id="email"
						type="email"
						value={form.email}
						onChange={handleChange("email")}
						placeholder="seu@email.com.br"
						className="text-sm"
					/>
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="phone" className="text-xs sm:text-sm">
						Telefone
					</Label>
					<Input
						id="phone"
						value={form.phone}
						onChange={handleChange("phone")}
						placeholder="(11) 99999-9999"
						className="text-sm"
					/>
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="crefito" className="text-xs sm:text-sm">
						CREFITO
					</Label>
					<Input
						id="crefito"
						value={form.crefito}
						onChange={handleChange("crefito")}
						placeholder="12345/F"
						className="text-sm"
					/>
				</div>
				<div className="space-y-1.5 sm:space-y-2">
					<Label htmlFor="specialty" className="text-xs sm:text-sm">
						Especialidade
					</Label>
					<Input
						id="specialty"
						value={form.specialty}
						onChange={handleChange("specialty")}
						placeholder="Ex: Ortopedia e Traumatologia"
						className="text-sm"
					/>
				</div>
				<Button
					className="w-full bg-gradient-primary text-primary-foreground hover:shadow-medical text-sm touch-target"
					onClick={() => mutation.mutate()}
					disabled={mutation.isPending}
				>
					{mutation.isPending ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Salvando...
						</>
					) : (
						"Salvar Alterações"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}
