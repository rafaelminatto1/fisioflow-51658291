import { fisioLogger as logger } from "@/lib/errors/logger";

type CapacitorPlatform = "web" | "ios" | "android";

type CapacitorGlobal = {
	isNativePlatform?: () => boolean;
	getPlatform?: () => string;
};

function getCapacitorGlobal(): CapacitorGlobal | undefined {
	if (typeof window === "undefined") return undefined;
	return (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
}

export interface CameraPhoto {
	webPath?: string | null;
	path?: string | null;
	format?: string;
}

export interface CameraPhotoOptions {
	quality?: number;
	allowEditing?: boolean;
	correctOrientation?: boolean;
	saveToGallery?: boolean;
	source: "camera" | "photos";
}

export interface NativePushToken {
	value: string;
}

export interface NativePushNotification {
	data?: Record<string, unknown>;
}

export interface NativePushActionPerformed {
	notification: NativePushNotification;
}

export type PushPermissionState =
	| "granted"
	| "denied"
	| "prompt"
	| "prompt-with-rationale";
export type HapticImpactStyle = "light" | "medium" | "heavy";
export type HapticNotificationType = "success" | "warning" | "error";

export function isNativePlatform(): boolean {
	const capacitor = getCapacitorGlobal();

	try {
		if (typeof capacitor?.isNativePlatform === "function") {
			return capacitor.isNativePlatform();
		}

		if (typeof capacitor?.getPlatform === "function") {
			return capacitor.getPlatform() !== "web";
		}
	} catch (error) {
		logger.warn(
			"Falha ao detectar plataforma nativa pelo bridge do Capacitor",
			error,
			"native-platform",
		);
	}

	return false;
}

export function getNativePlatform(): CapacitorPlatform {
	const capacitor = getCapacitorGlobal();
	const platform = capacitor?.getPlatform?.();
	return platform === "ios" || platform === "android" ? platform : "web";
}

export async function getCameraPhoto(
	options: CameraPhotoOptions,
): Promise<CameraPhoto> {
	const { Camera, CameraResultType, CameraSource } = await import(
		"@capacitor/camera"
	);

	return Camera.getPhoto({
		quality: options.quality,
		allowEditing: options.allowEditing,
		correctOrientation: options.correctOrientation,
		saveToGallery: options.saveToGallery,
		resultType: CameraResultType.Uri,
		source:
			options.source === "camera" ? CameraSource.Camera : CameraSource.Photos,
	});
}

export async function triggerHapticImpact(
	style: HapticImpactStyle = "light",
): Promise<void> {
	if (!isNativePlatform()) return;

	const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
	const impactStyleMap = {
		light: ImpactStyle.Light,
		medium: ImpactStyle.Medium,
		heavy: ImpactStyle.Heavy,
	} as const;

	await Haptics.impact({ style: impactStyleMap[style] });
}

export async function triggerHapticNotification(
	type: HapticNotificationType,
): Promise<void> {
	if (!isNativePlatform()) return;

	const { Haptics, NotificationType } = await import("@capacitor/haptics");
	const notificationTypeMap = {
		success: NotificationType.Success,
		warning: NotificationType.Warning,
		error: NotificationType.Error,
	} as const;

	await Haptics.notification({ type: notificationTypeMap[type] });
}

export async function triggerHapticSelection(): Promise<void> {
	if (!isNativePlatform()) return;

	const { Haptics } = await import("@capacitor/haptics");
	await Haptics.selectionStart();
	await Haptics.selectionEnd();
}

export async function triggerHapticVibration(duration: number): Promise<void> {
	if (!isNativePlatform()) return;

	const { Haptics } = await import("@capacitor/haptics");
	await Haptics.vibrate({ duration });
}

export async function shareWithNativeSheet(options: {
	title?: string;
	text?: string;
	url?: string;
	dialogTitle?: string;
}): Promise<void> {
	if (!isNativePlatform()) return;

	const { Share } = await import("@capacitor/share");
	await Share.share({
		title: options.title,
		text: options.text,
		url: options.url,
		dialogTitle: options.dialogTitle,
	});
}

export async function requestPushPermission(): Promise<PushPermissionState> {
	if (!isNativePlatform()) return "denied";

	const { PushNotifications } = await import("@capacitor/push-notifications");
	const result = await PushNotifications.requestPermissions();
	return result.receive;
}

export async function registerForPushNotifications(): Promise<void> {
	if (!isNativePlatform()) return;

	const { PushNotifications } = await import("@capacitor/push-notifications");
	await PushNotifications.register();
}

export async function addPushRegistrationListener(
	listener: (token: NativePushToken) => void | Promise<void>,
): Promise<void> {
	if (!isNativePlatform()) return;

	const { PushNotifications } = await import("@capacitor/push-notifications");
	await PushNotifications.addListener("registration", listener);
}

export async function addPushRegistrationErrorListener(
	listener: (error: unknown) => void,
): Promise<void> {
	if (!isNativePlatform()) return;

	const { PushNotifications } = await import("@capacitor/push-notifications");
	await PushNotifications.addListener("registrationError", listener);
}

export async function addPushReceivedListener(
	listener: (notification: NativePushNotification) => void | Promise<void>,
): Promise<void> {
	if (!isNativePlatform()) return;

	const { PushNotifications } = await import("@capacitor/push-notifications");
	await PushNotifications.addListener("pushNotificationReceived", listener);
}

export async function addPushActionListener(
	listener: (notification: NativePushActionPerformed) => void,
): Promise<void> {
	if (!isNativePlatform()) return;

	const { PushNotifications } = await import("@capacitor/push-notifications");
	await PushNotifications.addListener(
		"pushNotificationActionPerformed",
		listener,
	);
}

export async function scheduleLocalNotification(notification: {
	title: string;
	body: string;
	id: number;
}): Promise<void> {
	if (!isNativePlatform()) return;

	const { LocalNotifications } = await import("@capacitor/local-notifications");
	await LocalNotifications.schedule({
		notifications: [
			{
				title: notification.title,
				body: notification.body,
				id: notification.id,
				schedule: { at: new Date() },
				sound: "default",
				smallIcon: "ic_stat_icon_config_sample",
				iconColor: "#0EA5E9",
			},
		],
	});
}
