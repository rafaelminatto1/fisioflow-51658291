import { DynamicCompareMetrics } from '@/generated/types/dynamic_compare_metrics';
import { metricRegistry } from '../metrics/metricRegistry';
import { evaluateDeltaStatus } from '../metrics/deltaEngine';
import { GoalProfile, TargetMode, GoalStatus } from './goalProfiles.seed';

interface GoalEvaluationResult {
    key: string;
    label: string;
    targetMode: TargetMode;
    targetDisplay: string;
    currentValue: string; // Formatted
    status: GoalStatus;
    rationale?: string;
}

export const evaluateGoals = (
    compare: DynamicCompareMetrics,
    profile: GoalProfile,
    promSnapshot?: Record<string, number | null>
): { targets: GoalEvaluationResult[], overallStatus: "ON_TRACK" | "NEEDS_FOCUS" | "NA" } => {

    const results: GoalEvaluationResult[] = [];
    let metCount = 0;
    let validCount = 0;

    // Check Quality Gate
    if (profile.qualityGate?.minAnalysisConfidence0_100 && compare.quality.analysis_confidence_overall_0_100 < profile.qualityGate.minAnalysisConfidence0_100) {
        return { targets: [], overallStatus: "NA" };
    }

    for (const target of profile.targets) {
        // Find metric in Compare (Video) OR Snapshot (PROM)
        const videoMetric = compare.metric_deltas.find(m => m.key === target.key);
        const promValue = promSnapshot?.[target.key];

        const registryDef = metricRegistry[target.key];
        // Target override if present
        const displayLabel = target.label || registryDef?.label || target.key;
        const unit = registryDef?.unit || '';

        // -- Determine Values to check --
        let valB: number | null = null;
        let valA: number | null = null;

        if (videoMetric) {
            valB = videoMetric.value_B ?? null;
            valA = videoMetric.value_A ?? null;
        } else if (promValue !== undefined) {
            valB = promValue;
        }

        if (valB === null && target.mode !== 'CUSTOM') {
            results.push({
                key: target.key,
                label: displayLabel,
                targetMode: target.mode,
                targetDisplay: "N/A",
                currentValue: "N/A",
                status: "NA",
                rationale: "Métrica não encontrada na análise ou PROM faltante."
            });
            continue;
        }

        let status: GoalStatus = "NA";
        let targetDisplay = "";
        let currentValue = valB !== null ? `${valB.toFixed(1)}${unit}` : "N/A";

        // Logic
        switch (target.mode) {
            case "CUT_OFF": {
                // Determine direction based on min/max presence or registry
                // If min is set, usually Higher is Better (or we want to stay above).
                // If max is set, usually Lower is Better (or we want to stay below).

                const min = target.min;
                const max = target.max;

                if (min !== undefined) {
                    targetDisplay = `>= ${min}${unit}`;
                    if (valB! >= min) status = "MET";
                    else if (valB! >= min * 0.9) status = "PARTIAL";
                    else status = "NOT_MET";
                }
                if (max !== undefined) {
                    targetDisplay = `<= ${max}${unit}`;
                    if (valB! <= max) status = "MET";
                    else if (valB! <= max * 1.1) status = "PARTIAL";
                    else status = "NOT_MET";
                }
                break;
            }

            case "IMPROVEMENT_PCT": {
                if (valA === null || valA === 0) {
                    status = "NA";
                    break;
                }
                const minPct = target.minDeltaPct || 0;
                targetDisplay = `Melhora ${minPct}%`;

                const delta = valB! - valA;
                const deltaPct = (Math.abs(delta) / Math.abs(valA)) * 100;

                const evalStatus = evaluateDeltaStatus({
                    valueA: valA, valueB: valB, delta,
                    directionality: registryDef?.directionality || "HIGHER_IS_BETTER"
                });

                if (evalStatus === "IMPROVED") {
                    if (deltaPct >= minPct) status = "MET";
                    else status = "PARTIAL";
                } else if (evalStatus === "UNCHANGED") {
                    status = "NOT_MET";
                } else {
                    status = "NOT_MET";
                }

                currentValue = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} (${deltaPct.toFixed(0)}%)`;
                break;
            }

            case "IMPROVEMENT_ABS": {
                if (valA === null) { status = "NA"; break; }
                const minAbs = target.minDeltaAbs || 0;
                targetDisplay = `Melhora ${minAbs}${unit}`;

                const delta = valB! - valA;
                const evalStatus = evaluateDeltaStatus({
                    valueA: valA, valueB: valB, delta,
                    directionality: registryDef?.directionality || "HIGHER_IS_BETTER"
                });

                if (evalStatus === "IMPROVED") {
                    if (Math.abs(delta) >= minAbs) status = "MET";
                    else status = "PARTIAL";
                } else {
                    status = "NOT_MET";
                }
                currentValue = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
                break;
            }

            case "RANGE": {
                const min = target.min ?? -Infinity;
                const max = target.max ?? Infinity;
                targetDisplay = `${min} - ${max}${unit}`;
                if (valB! >= min && valB! <= max) status = "MET";
                else status = "NOT_MET";
                break;
            }
        }

        results.push({
            key: target.key,
            label: displayLabel,
            targetMode: target.mode,
            targetDisplay,
            currentValue,
            status,
            rationale: target.notes
        });

        if (status !== "NA") {
            validCount++;
            if (status === "MET") metCount++;
            if (status === "PARTIAL") metCount += 0.5;
        }
    }

    const ratio = validCount > 0 ? metCount / validCount : 0;

    return {
        targets: results,
        overallStatus: ratio >= 0.7 ? "ON_TRACK" : "NEEDS_FOCUS"
    };
};
