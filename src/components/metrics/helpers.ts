import { DynamicCompareMetrics } from "@/generated/types/dynamic_compare_metrics";

export const formatMetricValue = (value: number | null | undefined, unit?: string): string => {
    if (value === null || value === undefined) return "N/A";
    return `${value.toFixed(1)}${unit ? ' ' + unit : ''}`;
};

export const getMetricKeysFromDynamicCompare = (data: DynamicCompareMetrics): string[] => {
    return data.metric_deltas.map(d => d.key);
};

export const getMetricLabel = (data: DynamicCompareMetrics, key: string): string => {
    const metric = data.metric_deltas.find(d => d.key === key);
    return metric ? metric.label : key;
};
