import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { mfaService } from "@/lib/auth/mfa";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { fisioLogger as logger } from "@/lib/errors/logger";

export type TabValue =
	| "profile"
	| "notifications"
	| "security"
	| "schedule"
	| "a11y"
	| "organization";

export interface WorkingHours {
	start: string;
	end: string;
	lunchStart: string;
	lunchEnd: string;
}

export interface NotificationSettings {
	email: boolean;
	sms: boolean;
	push: boolean;
	appointments: boolean;
	reminders: boolean;
}

export interface AccessibilitySettings {
	highContrast: boolean;
	reducedMotion: boolean;
	fontSize: "small" | "medium" | "large";
}

const DEFAULT_WORKING_HOURS: WorkingHours = {
	start: "08:00",
	end: "18:00",
	lunchStart: "12:00",
	lunchEnd: "13:00",
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
	email: true,
	sms: false,
	push: true,
	appointments: true,
	reminders: true,
};

const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
	highContrast: false,
	reducedMotion: false,
	fontSize: "medium",
};

const VALID_TABS: TabValue[] = [
	"profile",
	"notifications",
	"security",
	"schedule",
	"a11y",
	"organization",
];

export function useSettingsState() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const { user, updatePassword } = useAuth();
	const { isAdmin } = usePermissions();
	const { toast } = useToast();

	const [activeTab, setActiveTab] = useState<TabValue>("profile");
	const [inviteModalOpen, setInviteModalOpen] = useState(false);

	// MFA State
	const [mfaEnabled, setMfaEnabled] = useState(false);
	const [mfaLoading, setMfaLoading] = useState(false);
	const [showMfaModal, setShowMfaModal] = useState(false);
	const [mfaQrCode, setMfaQrCode] = useState("");
	const [mfaSecret, setMfaSecret] = useState("");
	const [mfaFactorId, setMfaFactorId] = useState("");
	const [mfaVerifyCode, setMfaVerifyCode] = useState("");
	const [mfaVerifying, setMfaVerifying] = useState(false);

	// Settings State
	const [notifications, setNotifications] = useState<NotificationSettings>(
		DEFAULT_NOTIFICATIONS,
	);
	const [workingHours, setWorkingHours] = useState<WorkingHours>(
		DEFAULT_WORKING_HOURS,
	);

	// Password State
	const [passwordForm, setPasswordForm] = useState({
		newPassword: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState({
		new: false,
		confirm: false,
	});
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	// Sync tab with URL
	useEffect(() => {
		const tab = searchParams.get("tab") as TabValue;
		if (tab && VALID_TABS.includes(tab)) {
			if (tab === "organization" && !isAdmin) {
				setActiveTab("profile");
			} else {
				setActiveTab(tab);
			}
		}
	}, [searchParams, isAdmin]);

	const handleTabChange = useCallback(
		(value: string) => {
			const tabValue = value as TabValue;
			setActiveTab(tabValue);
			navigate(`/settings?tab=${tabValue}`, { replace: true });
		},
		[navigate],
	);

	// Load persistence
	useEffect(() => {
		if (!user?.uid) return;
		mfaService
			.getMFASettings(user.uid)
			.then((s) => setMfaEnabled(s.enabled))
			.catch(() => {});

		const savedHours = localStorage.getItem("workingHours");
		if (savedHours) {
			try {
				setWorkingHours(JSON.parse(savedHours));
			} catch (e) {
				logger.warn("Failed to parse working hours", e);
			}
		}
	}, [user?.uid]);

	const saveWorkingHours = useCallback(() => {
		localStorage.setItem("workingHours", JSON.stringify(workingHours));
		toast({ title: "Horários salvos!" });
	}, [workingHours, toast]);

	const handleEnable2FA = useCallback(
		async (enabled: boolean) => {
			if (!user?.uid) return;
			setMfaLoading(true);
			try {
				if (!enabled) {
					await mfaService.unenrollMFA(user.uid);
					setMfaEnabled(false);
					toast({ title: "2FA desativado" });
				} else {
					const result = await mfaService.enrollMFA(
						user.uid,
						"Authenticator App",
					);
					setMfaQrCode(result.qrCode);
					setMfaSecret(result.secret);
					setMfaFactorId(result.factorId);
					setShowMfaModal(true);
				}
			} catch  {
				toast({ title: "Erro MFA", variant: "destructive" });
			} finally {
				setMfaLoading(false);
			}
		},
		[user?.uid, toast],
	);

	const verifyMfa = useCallback(async () => {
		if (!mfaFactorId) return;
		setMfaVerifying(true);
		try {
			await mfaService.verifyMFAEnrollment(mfaFactorId, mfaVerifyCode.trim());
			setMfaEnabled(true);
			setShowMfaModal(false);
			toast({ title: "2FA ativado" });
		} catch {
			toast({ title: "Código inválido", variant: "destructive" });
		} finally {
			setMfaVerifying(false);
		}
	}, [mfaFactorId, mfaVerifyCode, toast]);

	const changePassword = useCallback(async () => {
		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			toast({ title: "Senhas não conferem", variant: "destructive" });
			return;
		}
		setIsChangingPassword(true);
		try {
			const res = await updatePassword(passwordForm.newPassword);
			if (res.error)
				toast({
					title: "Erro",
					description: res.error.message,
					variant: "destructive",
				});
			else {
				toast({ title: "Senha alterada!" });
				setPasswordForm({ newPassword: "", confirmPassword: "" });
			}
		} finally {
			setIsChangingPassword(false);
		}
	}, [passwordForm, updatePassword, toast]);

	return {
		activeTab,
		handleTabChange,
		user,
		isAdmin,
		inviteModalOpen,
		setInviteModalOpen,
		mfa: {
			enabled: mfaEnabled,
			loading: mfaLoading,
			showModal: showMfaModal,
			setShowModal: setShowMfaModal,
			qrCode: mfaQrCode,
			secret: mfaSecret,
			verifyCode: mfaVerifyCode,
			setVerifyCode: setMfaVerifyCode,
			verifying: mfaVerifying,
			handleEnable: handleEnable2FA,
			verify: verifyMfa,
		},
		notifications,
		setNotifications,
		workingHours,
		setWorkingHours,
		saveWorkingHours,
		password: {
			form: passwordForm,
			setForm: setPasswordForm,
			show: showPassword,
			setShow: setShowPassword,
			changing: isChangingPassword,
			change: changePassword,
			match:
				passwordForm.newPassword === passwordForm.confirmPassword &&
				!!passwordForm.newPassword,
		},
	};
}
