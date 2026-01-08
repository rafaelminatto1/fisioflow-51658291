import { Directionality } from './metricRegistry.zod';

interface EvaluateProps {
    valueA: number | null | undefined;
    valueB: number | null | undefined;
    delta: number | null | undefined; // Optional, can be calc'd
    directionality: Directionality;
    unchangedAbs?: number;
    unchangedPct?: number;
}

export type DeltaStatus = "IMPROVED" | "UNCHANGED" | "WORSE" | "NA";

export const evaluateDeltaStatus = (props: EvaluateProps): DeltaStatus => {
    const { valueA, valueB, directionality, unchangedAbs = 0, unchangedPct = 0 } = props;

    // 1. Check for nulls
    if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
        return "NA";
    }

    const delta = props.delta ?? (valueB - valueA);
    const absDelta = Math.abs(delta);
    const absValueA = Math.abs(valueA);

    // 2. UNCHANGED Logic
    // Check absolute threshold
    if (unchangedAbs > 0 && absDelta <= unchangedAbs) {
        return "UNCHANGED";
    }
    // Check percentage threshold (if previous value wasn't zero)
    if (unchangedPct > 0 && absValueA > 0) {
        const pctChange = (absDelta / absValueA) * 100;
        if (pctChange <= unchangedPct) {
            return "UNCHANGED";
        }
    }
    // Generic zero check (if no thresholds provided, exact zero is unchanged)
    if (delta === 0) return "UNCHANGED";

    // 3. Directionality Logic
    switch (directionality) {
        case "HIGHER_IS_BETTER":
            return delta > 0 ? "IMPROVED" : "WORSE";

        case "LOWER_IS_BETTER":
            return delta < 0 ? "IMPROVED" : "WORSE";

        case "CLOSER_TO_ZERO_IS_BETTER": {
            // Compare absolute distance to zero
            const distA = Math.abs(valueA);
            const distB = Math.abs(valueB);
            if (distB < distA) return "IMPROVED";
            if (distB > distA) return "WORSE";
            return "UNCHANGED";
        }

        case "NEUTRAL":
        case "UNKNOWN":
        default:
            return "NA"; // Or UNCHANGED? If direction is unknown, we can't say it's better or worse.
    }
};
