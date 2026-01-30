import { useState, useEffect, useCallback, useMemo } from 'react';
import { STATUS_CONFIG, DEFAULT_STATUS_COLORS } from '@/lib/config/agenda';
import type { StatusConfig, SessionStatus } from '@/types/agenda';
import { getTextColorClass, getOptimalTextColor } from '@/utils/colorContrast';
import { logger } from '@/lib/errors/logger';

const STORAGE_KEY = 'fisioflow_status_config';

export interface CustomStatusConfig {
    id: string;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    allowedActions: string[];
    isCustom: true;
}

interface StoredStatusConfig {
    customColors: Record<string, { color: string; bgColor: string; borderColor: string }>;
    customStatuses: CustomStatusConfig[];
}

const getStoredConfig = (): StoredStatusConfig => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        logger.error('Error reading status config from localStorage', e, 'useStatusConfig');
    }
    return { customColors: {}, customStatuses: [] };
};

const saveStoredConfig = (config: StoredStatusConfig) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        logger.error('Error saving status config to localStorage', e, 'useStatusConfig');
    }
};

export function useStatusConfig() {
    const [storedConfig, setStoredConfig] = useState<StoredStatusConfig>(() => getStoredConfig());

    // Merge default config with custom colors
    const statusConfig = useMemo(() => {
        const merged: Record<string, StatusConfig> = {};

        // Start with default configs
        Object.entries(STATUS_CONFIG).forEach(([key, value]) => {
            const customColor = storedConfig.customColors[key];
            if (customColor) {
                // Use color contrast utility to determine optimal text color
                const textColorClass = getTextColorClass(customColor.bgColor);
                merged[key] = {
                    ...value,
                    color: customColor.color,
                    bgColor: customColor.bgColor,
                    borderColor: customColor.borderColor,
                    twBg: `bg-[${customColor.bgColor}]`,
                    twBorder: `border-[${customColor.borderColor}]`,
                    twText: textColorClass,
                };
            } else {
                // Recalculate text color for default colors too (for consistency)
                const textColorClass = getTextColorClass(value.bgColor);
                merged[key] = {
                    ...value,
                    twText: textColorClass,
                };
            }
        });

        // Add custom statuses
        storedConfig.customStatuses.forEach((custom) => {
            const textColorClass = getTextColorClass(custom.bgColor);
            merged[custom.id] = {
                label: custom.label,
                color: custom.color,
                bgColor: custom.bgColor,
                borderColor: custom.borderColor,
                twBg: `bg-[${custom.bgColor}]`,
                twBorder: `border-[${custom.borderColor}]`,
                twText: textColorClass,
                allowedActions: custom.allowedActions,
            };
        });

        return merged;
    }, [storedConfig]);

    // Get status config for a specific status
    const getStatusConfig = useCallback((status: string): StatusConfig => {
        return statusConfig[status] || STATUS_CONFIG.agendado;
    }, [statusConfig]);

    // Update color for a status
    const updateStatusColor = useCallback((statusId: string, colors: { color: string; bgColor: string; borderColor: string }) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customColors: {
                    ...prev.customColors,
                    [statusId]: colors,
                },
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    // Create a new custom status
    const createStatus = useCallback((status: Omit<CustomStatusConfig, 'isCustom'>) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customStatuses: [
                    ...prev.customStatuses,
                    { ...status, isCustom: true as const },
                ],
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    // Update a custom status
    const updateStatus = useCallback((statusId: string, updates: Partial<Omit<CustomStatusConfig, 'id' | 'isCustom'>>) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customStatuses: prev.customStatuses.map(s =>
                    s.id === statusId ? { ...s, ...updates } : s
                ),
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    // Delete a custom status
    const deleteStatus = useCallback((statusId: string) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customStatuses: prev.customStatuses.filter(s => s.id !== statusId),
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    // Reset all customizations
    const resetToDefaults = useCallback(() => {
        const emptyConfig: StoredStatusConfig = { customColors: {}, customStatuses: [] };
        saveStoredConfig(emptyConfig);
        setStoredConfig(emptyConfig);
    }, []);

    // Reset a single status color to default
    const resetStatusColor = useCallback((statusId: string) => {
        setStoredConfig(prev => {
            const { [statusId]: _, ...restColors } = prev.customColors;
            const newConfig = {
                ...prev,
                customColors: restColors,
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    // Check if a status is custom
    const isCustomStatus = useCallback((statusId: string): boolean => {
        return storedConfig.customStatuses.some(s => s.id === statusId);
    }, [storedConfig.customStatuses]);

    // Check if a status has custom colors
    const hasCustomColors = useCallback((statusId: string): boolean => {
        return statusId in storedConfig.customColors;
    }, [storedConfig.customColors]);

    // Get all statuses (default + custom)
    const allStatuses = useMemo(() => {
        const defaultIds = Object.keys(STATUS_CONFIG) as SessionStatus[];
        const customIds = storedConfig.customStatuses.map(s => s.id);
        return [...defaultIds, ...customIds];
    }, [storedConfig.customStatuses]);

    return {
        statusConfig,
        getStatusConfig,
        updateStatusColor,
        createStatus,
        updateStatus,
        deleteStatus,
        resetToDefaults,
        resetStatusColor,
        isCustomStatus,
        hasCustomColors,
        allStatuses,
        customStatuses: storedConfig.customStatuses,
    };
}
