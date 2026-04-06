import React, { lazy, Suspense } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Shield,
	Bell,
	UserPlus,
	Users,
	FileText,
	Mail,
	Eye,
	EyeOff,
	Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BackupSettings = lazy(() =>
	import("@/components/settings/BackupSettings").then((module) => ({
		default: module.BackupSettings,
	})),
);

export function SecurityTab({
	isAdmin,
	user: _user,
	mfa,
	password,
	navigate,
	onInvite,
}: any) {
	return (
		<div className="space-y-3 sm:space-y-4 lg:space-y-6">
			{/* Atalhos */}
			<Card className="bg-gradient-card border-border shadow-card">
				<CardHeader className="border-b border-border p-3 sm:p-4">
					<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
						Atalhos
					</CardTitle>
					<CardDescription className="text-xs sm:text-sm">
						Acesso rápido às páginas de notificações e segurança
					</CardDescription>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 lg:p-6 flex flex-wrap gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={() => navigate("/notifications")}
					>
						<Bell className="mr-2 h-4 w-4" /> Notificações
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => navigate("/security-settings")}
					>
						<Shield className="mr-2 h-4 w-4" /> Segurança Avançada
					</Button>
				</CardContent>
			</Card>

			{/* Admin Section */}
			{isAdmin && (
				<Card className="bg-gradient-card border-border shadow-card">
					<CardHeader className="border-b border-border p-3 sm:p-4">
						<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
							<Shield className="w-4 h-4 sm:w-5 sm:h-5" /> Gerenciamento de
							Usuários
						</CardTitle>
					</CardHeader>
					<CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<Button onClick={onInvite} className="w-full justify-start">
								<UserPlus className="mr-2 h-4 w-4" /> Convidar Usuário
							</Button>
							<Button
								onClick={() => navigate("/admin/users")}
								variant="outline"
								className="w-full justify-start"
							>
								<Users className="mr-2 h-4 w-4" /> Gerenciar Membros
							</Button>
							<Button
								onClick={() => navigate("/admin/audit-logs")}
								variant="outline"
								className="w-full justify-start"
							>
								<FileText className="mr-2 h-4 w-4" /> Logs de Auditoria
							</Button>
							<Button
								onClick={() => navigate("/admin/invitations")}
								variant="outline"
								className="w-full justify-start"
							>
								<Mail className="mr-2 h-4 w-4" /> Ver Convites
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Change Password */}
			<Card className="bg-gradient-card border-border shadow-card">
				<CardHeader className="border-b border-border p-3 sm:p-4">
					<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
						Alterar Senha
					</CardTitle>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 lg:p-6 space-y-4">
					<div className="space-y-2">
						<Label>Nova senha</Label>
						<div className="relative">
							<Input
								type={password.show.new ? "text" : "password"}
								value={password.form.newPassword}
								onChange={(e) =>
									password.setForm({
										...password.form,
										newPassword: e.target.value,
									})
								}
							/>
							<button
								type="button"
								onClick={() =>
									password.setShow({
										...password.show,
										new: !password.show.new,
									})
								}
								className="absolute right-3 top-1/2 -translate-y-1/2"
							>
								{password.show.new ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>
					<div className="space-y-2">
						<Label>Confirmar senha</Label>
						<div className="relative">
							<Input
								type={password.show.confirm ? "text" : "password"}
								value={password.form.confirmPassword}
								onChange={(e) =>
									password.setForm({
										...password.form,
										confirmPassword: e.target.value,
									})
								}
							/>
							<button
								type="button"
								onClick={() =>
									password.setShow({
										...password.show,
										confirm: !password.show.confirm,
									})
								}
								className="absolute right-3 top-1/2 -translate-y-1/2"
							>
								{password.show.confirm ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>
					<Button
						onClick={password.change}
						disabled={password.changing || !password.match}
						className="w-full"
					>
						{password.changing ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : null}
						Atualizar Senha
					</Button>
				</CardContent>
			</Card>

			{/* MFA Section */}
			<Card className="bg-gradient-card border-border shadow-card">
				<CardHeader className="border-b border-border p-3 sm:p-4">
					<CardTitle className="text-foreground flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
						Autenticação em Duas Etapas
					</CardTitle>
				</CardHeader>
				<CardContent className="p-3 sm:p-4 lg:p-6">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>MFA (Google Authenticator)</Label>
							<p className="text-xs text-muted-foreground">
								Proteja sua conta com um segundo fator de autenticação
							</p>
						</div>
						<Switch
							checked={mfa.enabled}
							onCheckedChange={mfa.handleEnable}
							disabled={mfa.loading}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Backup */}
			<Card>
				<CardHeader>
					<CardTitle>Backup e Restauração</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<Skeleton className="h-20 w-full" />}>
						<BackupSettings />
					</Suspense>
				</CardContent>
			</Card>

			{/* MFA Modal */}
			<Dialog open={mfa.showModal} onOpenChange={mfa.setShowModal}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Configurar MFA</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center space-y-4 py-4">
						{mfa.qrCode && (
							<img
								src={mfa.qrCode}
								alt="QR Code"
								className="w-48 h-48 border rounded"
							/>
						)}
						<code className="text-xs bg-muted p-2 rounded">{mfa.secret}</code>
						<div className="w-full space-y-2">
							<Label>Código de 6 dígitos</Label>
							<Input
								placeholder="000000"
								maxLength={6}
								value={mfa.verifyCode}
								onChange={(e) => mfa.setVerifyCode(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={mfa.verify}
							disabled={mfa.verifying || mfa.verifyCode.length < 6}
						>
							{mfa.verifying ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Ativar MFA
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
