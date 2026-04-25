import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "com.moocafisio.fisioflow",
	appName: "FisioFlow",
	webDir: "apps/web/dist",
	bundledWebRuntime: false,

	server: {
		// Em produção a app carrega o bundle local; HTTPS scheme garante
		// que cookies SameSite=None do Neon Auth e PWA caches funcionem.
		androidScheme: "https",
		iosScheme: "https",
		hostname: "moocafisio.com.br",
		allowNavigation: [
			"moocafisio.com.br",
			"*.moocafisio.com.br",
			"api-pro.moocafisio.com.br",
			"api-paciente.moocafisio.com.br",
			"media.moocafisio.com.br",
			"*.neonauth.sa-east-1.aws.neon.tech",
			"*.workers.dev",
		],
	},

	ios: {
		contentInset: "automatic",
		scheme: "FisioFlow",
		limitsNavigationsToAppBoundDomains: false,
	},

	android: {
		allowMixedContent: false,
		webContentsDebuggingEnabled: false,
		captureInput: true,
	},

	plugins: {
		SplashScreen: {
			launchShowDuration: 1500,
			launchAutoHide: true,
			backgroundColor: "#0EA5E9",
			androidSplashResourceName: "splash",
			androidScaleType: "CENTER_CROP",
			showSpinner: false,
			splashFullScreen: true,
			splashImmersive: true,
		},
		StatusBar: {
			style: "DARK",
			backgroundColor: "#0EA5E9",
			overlaysWebView: false,
		},
		PushNotifications: {
			presentationOptions: ["badge", "sound", "alert"],
		},
		LocalNotifications: {
			smallIcon: "ic_stat_icon_config_sample",
			iconColor: "#0EA5E9",
		},
		Keyboard: {
			resize: "body",
			resizeOnFullScreen: true,
		},
		Camera: {
			permissions: ["camera", "photos"],
		},
	},
};

export default config;
