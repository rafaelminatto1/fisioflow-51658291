/**
 * Settings Page - Central de configurações refatorada e modular.
 */

import React, { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, Clock, Contrast, Building2 } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Hooks Modulares
import { useSettingsState } from "@/hooks/settings/useSettingsState";

// Tabs Components
import { ProfileTab } from "@/components/settings/tabs/ProfileTab";
import { NotificationsTab } from "@/components/settings/tabs/NotificationsTab";
import { SecurityTab } from "@/components/settings/tabs/SecurityTab";
import { ScheduleTab } from "@/components/settings/tabs/ScheduleTab";
import { AccessibilityTab } from "@/components/settings/tabs/AccessibilityTab";
import { OrganizationTab } from "@/components/settings/tabs/OrganizationTab";

// Lazy Modals
const InviteUserModal = lazy(() =>
	import("@/components/admin/InviteUserModal").then((m) => ({
		default: m.InviteUserModal,
	})),
);

export default function Settings() {
	const navigate = useNavigate();
	const state = useSettingsState();

	return (
		<MainLayout>
			<div className="space-y-4 sm:space-y-6 animate-fade-in">
				<div>
					<h1 className="text-xl sm:text-2xl font-bold text-foreground">
						Configurações
					</h1>
					<p className="text-xs sm:text-sm text-muted-foreground">
						Gerencie sua conta e as preferências do sistema
					</p>
				</div>

				<Tabs
					value={state.activeTab}
					onValueChange={state.handleTabChange}
					className="w-full"
				>
					<TabsList
						className={`grid w-full ${state.isAdmin ? "grid-cols-6" : "grid-cols-5"} h-9 sm:h-10 gap-0.5`}
					>
						<TabsTrigger
							value="profile"
							className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs"
						>
							<User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							<span className="hidden xs:inline">Perfil</span>
						</TabsTrigger>
						<TabsTrigger
							value="notifications"
							className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs"
						>
							<Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							<span className="hidden xs:inline">Notif</span>
						</TabsTrigger>
						<TabsTrigger
							value="security"
							className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs"
						>
							<Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							<span className="hidden xs:inline">Segurança</span>
						</TabsTrigger>
						{state.isAdmin && (
							<TabsTrigger
								value="organization"
								className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs"
							>
								<Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
								<span className="hidden xs:inline">Clínica</span>
							</TabsTrigger>
						)}
						<TabsTrigger
							value="schedule"
							className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs"
						>
							<Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							<span className="hidden xs:inline">Horários</span>
						</TabsTrigger>
						<TabsTrigger
							value="a11y"
							className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs"
						>
							<Contrast className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							<span className="hidden xs:inline">Acessib.</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="profile" className="pt-4">
						<ProfileTab />
					</TabsContent>
					<TabsContent value="notifications" className="pt-4">
						<NotificationsTab />
					</TabsContent>
					<TabsContent value="security" className="pt-4">
						<SecurityTab
							isAdmin={state.isAdmin}
							user={state.user}
							mfa={state.mfa}
							password={state.password}
							navigate={navigate}
							onInvite={() => state.setInviteModalOpen(true)}
						/>
					</TabsContent>
					{state.isAdmin && (
						<TabsContent value="organization" className="pt-4">
							<OrganizationTab />
						</TabsContent>
					)}
					<TabsContent value="schedule" className="pt-4">
						<ScheduleTab
							workingHours={state.workingHours}
							setWorkingHours={state.setWorkingHours}
							onSave={state.saveWorkingHours}
						/>
					</TabsContent>
					<TabsContent value="a11y" className="pt-4">
						<AccessibilityTab />
					</TabsContent>
				</Tabs>
			</div>

			<Suspense fallback={null}>
				<InviteUserModal
					open={state.inviteModalOpen}
					onOpenChange={state.setInviteModalOpen}
				/>
			</Suspense>
		</MainLayout>
	);
}
