import { useState, useCallback, useMemo } from "react";
import {
	APPOINTMENT_STATUS_CONFIG,
	getStatusColor,
	getCalendarCardColors,
	lightenColor,
	normalizeStatus,
	type AppointmentStatusConfig,
} from "@/components/schedule/shared/appointment-status";
import { getOptimalTextColor, getTextColorClass } from "@/utils/colorContrast";
import { fisioLogger as logger } from "@/lib/errors/logger";

const STORAGE_KEY = "fisioflow_status_config";

export interface CustomStatusConfig extends Partial<AppointmentStatusConfig> {
	id: string;
	label: string;
	color: string;
	bgColor: string;
	borderColor: string;
	allowedActions: string[];
	isCustom?: boolean;
}

interface StoredStatusConfig {
	customColors: Record<
		string,
		{ color: string; bgColor: string; borderColor: string }
	>;
	customStatuses: CustomStatusConfig[];
}

type StatusColors = StoredStatusConfig["customColors"][string];

const getDefaultStatusColors = (statusId: string): StatusColors => {
	const color = getStatusColor(statusId);
	return { color, bgColor: color, borderColor: color };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeStoredConfig = (value: unknown): StoredStatusConfig => {
	if (!isRecord(value)) return { customColors: {}, customStatuses: [] };

	const customColors: StoredStatusConfig["customColors"] = {};
	if (isRecord(value.customColors)) {
		Object.entries(value.customColors).forEach(([statusId, colors]) => {
			if (!isRecord(colors)) return;
			const color = typeof colors.color === "string" ? colors.color : undefined;
			const bgColor =
				typeof colors.bgColor === "string" ? colors.bgColor : color;
			const borderColor =
				typeof colors.borderColor === "string" ? colors.borderColor : color;
			if (color && bgColor && borderColor) {
				customColors[statusId] = { color, bgColor, borderColor };
			}
		});
	}

	const customStatuses = Array.isArray(value.customStatuses)
		? value.customStatuses
				.filter(isRecord)
				.map((status) => {
					const id = typeof status.id === "string" ? status.id : "";
					const label = typeof status.label === "string" ? status.label : "";
					const fallbackColor =
						typeof status.color === "string" ? status.color : "#0073EA";
					const allowedActions = Array.isArray(status.allowedActions)
						? status.allowedActions.filter(
								(action): action is string => typeof action === "string",
							)
						: ["view", "edit"];

					if (!id || !label) return null;

					const normalizedStatus: CustomStatusConfig = {
						id,
						label,
						color: fallbackColor,
						bgColor:
							typeof status.bgColor === "string"
								? status.bgColor
								: fallbackColor,
						borderColor:
							typeof status.borderColor === "string"
								? status.borderColor
								: fallbackColor,
						allowedActions,
						isCustom: true,
					};

					return normalizedStatus;
				})
				.filter((status): status is CustomStatusConfig => status !== null)
		: [];

	return { customColors, customStatuses };
};

const getStoredConfig = (): StoredStatusConfig => {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			return normalizeStoredConfig(JSON.parse(stored));
		}
	} catch (e) {
		logger.error(
			"Error reading status config from localStorage",
			e,
			"useStatusConfig",
		);
	}
	return { customColors: {}, customStatuses: [] };
};

const saveStoredConfig = (config: StoredStatusConfig) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
	} catch (e) {
		logger.error(
			"Error saving status config to localStorage",
			e,
			"useStatusConfig",
		);
	}
};

export function useStatusConfig() {
	const [storedConfig, setStoredConfig] = useState<StoredStatusConfig>(() =>
		getStoredConfig(),
	);

	const statusConfig = useMemo(() => {
		const merged: Record<string, any> = {};

		Object.entries(APPOINTMENT_STATUS_CONFIG).forEach(([key, value]) => {
			const customColor = storedConfig.customColors[key];
			if (customColor) {
				const textColorClass = getTextColorClass(customColor.bgColor);
				const calendarColors = {
					accent: customColor.borderColor || customColor.color,
					background: lightenColor(
						customColor.bgColor || customColor.color,
						0.88,
					),
					text: customColor.color,
				};
				merged[key] = {
					...value,
					color: customColor.color,
					bgColor: customColor.bgColor,
					bg: customColor.bgColor,
					borderColor: customColor.borderColor,
					text: textColorClass,
					calendarCardColors: calendarColors,
				};
			} else {
				const defaultColors = getDefaultStatusColors(key);
				const calendarColors = getCalendarCardColors(key);
				merged[key] = {
					...value,
					color: defaultColors.color,
					bgColor: defaultColors.bgColor,
					calendarCardColors: calendarColors,
				};
			}
		});

		storedConfig.customStatuses.forEach((custom) => {
			const textColorClass = getTextColorClass(custom.bgColor);
			const calendarColors = {
				accent: custom.borderColor || custom.color,
				background: lightenColor(custom.bgColor || custom.color, 0.88),
				text: custom.color,
			};
			merged[custom.id] = {
				...APPOINTMENT_STATUS_CONFIG.agendado,
				...custom,
				text: textColorClass,
				calendarCardColors: calendarColors,
			};
		});

		return merged;
	}, [storedConfig]);

	const getStatusConfig = useCallback(
		(status: string): AppointmentStatusConfig => {
			return statusConfig[status] || APPOINTMENT_STATUS_CONFIG.agendado;
		},
		[statusConfig],
	);

	const updateStatusColor = useCallback(
		(
			statusId: string,
			colors: { color: string; bgColor: string; borderColor: string },
		) => {
			setStoredConfig((prev) => {
				const newConfig = {
					...prev,
					customColors: { ...prev.customColors, [statusId]: colors },
				};
				saveStoredConfig(newConfig);
				return newConfig;
			});
		},
		[],
	);

	const resetStatusColor = useCallback((statusId: string) => {
		setStoredConfig((prev) => {
			const { [statusId]: _removed, ...customColors } = prev.customColors;
			const newConfig = { ...prev, customColors };
			saveStoredConfig(newConfig);
			return newConfig;
		});
	}, []);

	const hasCustomColors = useCallback(
		(statusId: string) => Boolean(storedConfig.customColors[statusId]),
		[storedConfig.customColors],
	);

	const _isCustomStatus = useCallback(
		(statusId: string) =>
			storedConfig.customStatuses.some((status) => status.id === statusId),
		[storedConfig.customStatuses],
	);

	const getStatusColors = useCallback(
		(statusId: string): StatusColors => {
			const normalizedStatus = normalizeStatus(statusId);
			const customStatus = storedConfig.customStatuses.find(
				(status) => status.id === statusId,
			);
			return (
				storedConfig.customColors[statusId] ||
				(customStatus
					? {
							color: customStatus.color,
							bgColor: customStatus.bgColor,
							borderColor: customStatus.borderColor,
						}
					: getDefaultStatusColors(normalizedStatus))
			);
		},
		[storedConfig.customColors, storedConfig.customStatuses],
	);

	const createStatus = useCallback(
		(status: Omit<CustomStatusConfig, "isCustom">) => {
			setStoredConfig((prev) => {
				const newConfig = {
					...prev,
					customStatuses: [
						...prev.customStatuses,
						{ ...status, isCustom: true },
					],
				};
				saveStoredConfig(newConfig);
				return newConfig;
			});
		},
		[],
	);

	const updateStatus = useCallback(
		(
			statusId: string,
			updates: Partial<Omit<CustomStatusConfig, "id" | "isCustom">>,
		) => {
			setStoredConfig((prev) => {
				const newConfig = {
					...prev,
					customStatuses: prev.customStatuses.map((s) =>
						s.id === statusId ? { ...s, ...updates } : s,
					),
				};
				saveStoredConfig(newConfig);
				return newConfig;
			});
		},
		[],
	);

	const deleteStatus = useCallback((statusId: string) => {
		setStoredConfig((prev) => {
			const newConfig = {
				...prev,
				customStatuses: prev.customStatuses.filter((s) => s.id !== statusId),
			};
			saveStoredConfig(newConfig);
			return newConfig;
		});
	}, []);

	const resetToDefaults = useCallback(() => {
		const emptyConfig: StoredStatusConfig = {
			customColors: {},
			customStatuses: [],
		};
		saveStoredConfig(emptyConfig);
		setStoredConfig(emptyConfig);
	}, []);

	return {
		statusConfig,
		getStatusConfig,
		updateStatusColor,
		resetStatusColor,
		hasCustomColors,
		_isCustomStatus,
		getStatusColors,
		createStatus,
		updateStatus,
		deleteStatus,
		resetToDefaults,
		allStatuses: Object.keys(statusConfig),
		customStatuses: storedConfig.customStatuses,
	};
}
