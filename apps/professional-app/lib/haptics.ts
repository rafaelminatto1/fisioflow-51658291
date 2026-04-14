import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

function isHapticsSupported(): boolean {
	return Platform.OS === "ios" || Platform.OS === "android";
}

function androidVibrate(ms: number = 10): void {
	if (Platform.OS === "android") {
		try {
			Vibration.vibrate(ms);
		} catch {}
	}
}

export async function hapticLight(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		} else {
			androidVibrate(5);
		}
	} catch {}
}

export async function hapticMedium(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} else {
			androidVibrate(10);
		}
	} catch {}
}

export async function hapticHeavy(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
		} else {
			androidVibrate(20);
		}
	} catch {}
}

export async function hapticSuccess(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} else {
			Vibration.vibrate([0, 30, 50, 30]);
		}
	} catch {}
}

export async function hapticWarning(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
		} else {
			Vibration.vibrate([0, 50, 50, 50]);
		}
	} catch {}
}

export async function hapticError(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} else {
			Vibration.vibrate([0, 80, 50, 80, 50, 80]);
		}
	} catch {}
}

export async function hapticSelection(): Promise<void> {
	if (!isHapticsSupported()) return;
	try {
		if (Platform.OS === "ios") {
			await Haptics.selectionAsync();
		} else {
			androidVibrate(3);
		}
	} catch {}
}

export const haptic = {
	light: hapticLight,
	medium: hapticMedium,
	heavy: hapticHeavy,
	success: hapticSuccess,
	warning: hapticWarning,
	error: hapticError,
	selection: hapticSelection,
};
