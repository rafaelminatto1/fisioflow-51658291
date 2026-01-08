import { DynamicCompareMetrics } from "@/generated/types/dynamic_compare_metrics";
import dynamicCompareMetricsSchema from "@/generated/zod/dynamic_compare_metrics.zod";
import { validateDynamicCompare } from "./ajv";

export const parseDynamicCompare = (data: unknown): DynamicCompareMetrics => {
    // 1. AJV Validation (Schema Compliance)
    const ajvResult = validateDynamicCompare(data);
    if (!ajvResult.ok) {
        throw new Error(`AJV Validation Failed:\n${ajvResult.errors?.join("\n")}`);
    }

    // 2. Zod Validation (Runtime Type Coercion/Checks if used)
    // The generated Zod schema matches the JSON Schema structure.
    const zodResult = dynamicCompareMetricsSchema.safeParse(data);

    if (!zodResult.success) {
        throw new Error(`Zod Validation Failed:\n${zodResult.error.errors.map(e => e.message).join("\n")}`);
    }

    return zodResult.data as DynamicCompareMetrics;
};
