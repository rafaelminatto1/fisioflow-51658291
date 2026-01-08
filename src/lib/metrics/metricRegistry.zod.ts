import { z } from 'zod';

export type MetricUnit = "deg" | "pct" | "s" | "ms" | "mm" | "mm2" | "mm_s" | "px" | "px2" | "px_s" | "score_0_100" | "spm" | "ratio" | "count" | "na" | "m/s";
export type Directionality = "LOWER_IS_BETTER" | "HIGHER_IS_BETTER" | "CLOSER_TO_ZERO_IS_BETTER" | "UNKNOWN" | "NEUTRAL";
export type MetricGroup = "GAIT" | "SQUAT_OVERHEAD" | "ROMBERG" | "DYNAMIC_COMPARE" | "PROM";

export const MetricDefinitionSchema = z.object({
    key: z.string(),
    label: z.string(),
    shortLabel: z.string().optional(),
    description: z.string().optional(),
    unit: z.enum(["deg", "pct", "s", "ms", "mm", "mm2", "mm_s", "px", "px2", "px_s", "score_0_100", "spm", "ratio", "count", "na", "m/s"]),
    directionality: z.enum(["LOWER_IS_BETTER", "HIGHER_IS_BETTER", "CLOSER_TO_ZERO_IS_BETTER", "UNKNOWN", "NEUTRAL"]),
    group: z.enum(["GAIT", "SQUAT_OVERHEAD", "ROMBERG", "DYNAMIC_COMPARE", "PROM"]),
    tags: z.array(z.string()).optional(),
    recommendedViews: z.array(z.enum(["FRONTAL", "LATERAL", "OBLIQUE"])).optional(),
    requiresCalibration: z.boolean().optional(),
    chart: z.object({
        defaultChart: z.enum(["LINE", "BAR", "AREA", "NONE"]),
        decimals: z.number().optional(),
        domain: z.tuple([z.number().nullable(), z.number().nullable()]).optional(),
    }),
    thresholds: z.object({
        unchangedAbs: z.number().optional(),
        unchangedPct: z.number().optional(),
    }).optional(),
    qualityGate: z.object({
        minConfidence0_100: z.number().optional(),
    }).optional(),
});

export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;

export const MetricRegistrySchema = z.record(z.string(), MetricDefinitionSchema);
