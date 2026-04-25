export const CameraResultType = {
	Uri: "uri",
} as const;

export const CameraSource = {
	Camera: "camera",
	Photos: "photos",
} as const;

export const Camera = {
	async getPhoto() {
		return { webPath: null, path: null, format: "jpeg" };
	},
};

export const ImpactStyle = {
	Light: "light",
	Medium: "medium",
	Heavy: "heavy",
} as const;

export const NotificationType = {
	Success: "success",
	Warning: "warning",
	Error: "error",
} as const;

export const Haptics = {
	async impact() {},
	async notification() {},
	async selectionStart() {},
	async selectionEnd() {},
	async vibrate() {},
};

export const Share = {
	async share() {},
};

export const PushNotifications = {
	async requestPermissions() {
		return { receive: "denied" as const };
	},
	async register() {},
	async addListener() {
		return { remove: async () => {} };
	},
};

export const LocalNotifications = {
	async schedule() {},
};

export const Device = {};
export const Geolocation = {};
export const Keyboard = {};
export const SplashScreen = {};
export const StatusBar = {};

export default {
	Camera,
	CameraResultType,
	CameraSource,
	Haptics,
	ImpactStyle,
	NotificationType,
	Share,
	PushNotifications,
	LocalNotifications,
	Device,
	Geolocation,
	Keyboard,
	SplashScreen,
	StatusBar,
};
