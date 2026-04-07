import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

export interface BuildEnvironment {
	isExpoGo: boolean;
	isDevelopmentBuild: boolean;
	isProductionBuild: boolean;
	isSimulator: boolean;
	platform: "ios" | "android" | "web";
}

export function getBuildEnvironment(): BuildEnvironment {
	const executionEnvironment = Constants.executionEnvironment;

	return {
		isExpoGo: executionEnvironment === ExecutionEnvironment.StoreClient,
		isDevelopmentBuild:
			executionEnvironment === ExecutionEnvironment.StoreClient
				? false
				: __DEV__,
		isProductionBuild:
			executionEnvironment === ExecutionEnvironment.Standalone && !__DEV__,
		isSimulator: !Constants.isDevice,
		platform: Platform.OS as "ios" | "android" | "web",
	};
}

export function isFeatureAvailable(
	feature:
		| "liveCamera"
		| "poseDetection"
		| "charts"
		| "notifications"
		| "biometrics",
): boolean {
	const env = getBuildEnvironment();

	const featureAvailability: Record<typeof feature, boolean> = {
		liveCamera: !env.isExpoGo,
		poseDetection: !env.isExpoGo,
		charts: true,
		notifications: !env.isExpoGo || env.platform === "ios",
		biometrics: !env.isExpoGo || env.platform === "ios",
	};

	return featureAvailability[feature];
}
