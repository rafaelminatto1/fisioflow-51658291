import { useState, useCallback, useMemo } from 'react';
import { APPOINTMENT_STATUS_CONFIG, type AppointmentStatusConfig } from '@/components/schedule/shared/appointment-status';
import { getTextColorClass } from '@/utils/colorContrast';
import { fisioLogger as logger } from '@/lib/errors/logger';

const STORAGE_KEY = 'fisioflow_status_config';

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

    const statusConfig = useMemo(() => {
        const merged: Record<string, any> = {};

        // Use APPOINTMENT_STATUS_CONFIG as base
        Object.entries(APPOINTMENT_STATUS_CONFIG).forEach(([key, value]) => {
            const customColor = storedConfig.customColors[key];
            if (customColor) {
                const textColorClass = getTextColorClass(customColor.bgColor);
                merged[key] = {
                    ...value,
                    bg: customColor.bgColor,
                    borderColor: customColor.borderColor,
                    text: textColorClass,
                };
            } else {
                merged[key] = value;
            }
        });

        // Add custom statuses
        storedConfig.customStatuses.forEach((custom) => {
            const textColorClass = getTextColorClass(custom.bgColor);
            merged[custom.id] = {
                ...APPOINTMENT_STATUS_CONFIG.agendado, // base for custom ones
                ...custom,
                text: textColorClass,
            };
        });

        return merged;
    }, [storedConfig]);

    const getStatusConfig = useCallback((status: string): AppointmentStatusConfig => {
        return statusConfig[status] || APPOINTMENT_STATUS_CONFIG.agendado;
    }, [statusConfig]);

    const updateStatusColor = useCallback((statusId: string, colors: { color: string; bgColor: string; borderColor: string }) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customColors: { ...prev.customColors, [statusId]: colors },
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    const createStatus = useCallback((status: Omit<CustomStatusConfig, 'isCustom'>) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customStatuses: [...prev.customStatuses, { ...status, isCustom: true }],
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

    const updateStatus = useCallback((statusId: string, updates: Partial<Omit<CustomStatusConfig, 'id' | 'isCustom'>>) => {
        setStoredConfig(prev => {
            const newConfig = {
                ...prev,
                customStatuses: prev.customStatuses.map(s => s.id === statusId ? { ...s, ...updates } : s),
            };
            saveStoredConfig(newConfig);
            return newConfig;
        });
    }, []);

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

    const resetToDefaults = useCallback(() => {
        const emptyConfig: StoredStatusConfig = { customColors: {}, customStatuses: [] };
        saveStoredConfig(emptyConfig);
        setStoredConfig(emptyConfig);
    }, []);

    return {
        statusConfig,
        getStatusConfig,
        updateStatusColor,
        createStatus,
        updateStatus,
        deleteStatus,
        resetToDefaults,
        allStatuses: Object.keys(statusConfig),
        customStatuses: storedConfig.customStatuses,
    };
}
