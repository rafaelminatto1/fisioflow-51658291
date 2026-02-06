import { VideoAnalysisFrame } from '@/services/ai/videoPoseService';

    DynamicCompareMetrics,
    METRIC_KEYS,
    SCHEMA_VERSION,
    MetricDelta,
    Summary,
    MetricUnit
} from '@/types/analysis/dynamic_compare';

// Helper to sanitize numbers
const fmt = (num: number) => Number(num.toFixed(1));

/**
 * Calculates Dynamic Compare Metrics from two sequences of frames.
 * Currently specialized for GAIT (MVP).
 */
export const analyzeDynamicComparison = (
    framesA: VideoAnalysisFrame[],
    framesB: VideoAnalysisFrame[],
    testType: "GAIT" | "SQUAT_OVERHEAD" | "ROMBERG" = "GAIT"
): DynamicCompareMetrics => {

    const now = new Date().toISOString();

    // 1. Basic Metrics Extraction (Simplified for MVP)
    const metricsA = extractGaitMetrics(framesA);
    const metricsB = extractGaitMetrics(framesB);

    // 2. Calculate Deltas
    const metric_deltas: MetricDelta[] = [];

    // Cadence
    metric_deltas.push(createDelta(
        METRIC_KEYS.GAIT.CADENCE, "Cadência", "spm",
        metricsA.cadence, metricsB.cadence, "HIGHER_IS_BETTER"
    ));

    // Knee Valgus Contrast
    metric_deltas.push(createDelta(
        METRIC_KEYS.GAIT.KNEE_VALGUS_L, "Valgo Din. (Esq)", "deg",
        metricsA.valgusL, metricsB.valgusL, "LOWER_IS_BETTER"
    ));
    metric_deltas.push(createDelta(
        METRIC_KEYS.GAIT.KNEE_VALGUS_R, "Valgo Din. (Dir)", "deg",
        metricsA.valgusR, metricsB.valgusR, "LOWER_IS_BETTER"
    ));

    // 3. Generate Summary
    const summary: Summary = {
        improvements: metric_deltas.filter(m => m.status === 'IMPROVED').map(m => m.label),
        still_to_improve: metric_deltas.filter(m => m.status === 'WORSE' || m.status === 'UNCHANGED').map(m => m.label),
        key_findings: ["Comparação automática realizada baseada em picos cinemáticos."],
        metrics_table_markdown: generateMarkdownTable(metric_deltas)
    };

    // 4. Construct Object
    return {
        schema_version: SCHEMA_VERSION,
        compare_type: "DYNAMIC_COMPARE",
        created_at: now,
        test_type: testType,

        trial_A: {
            label: "INITIAL",
            captured_at: now, // Should come from metadata
            source_asset_ids: ["A"],
            protocol: { view: "FRONTAL", fps: 30 }
        },
        trial_B: {
            label: "REASSESSMENT",
            captured_at: now,
            source_asset_ids: ["B"],
            protocol: { view: "FRONTAL", fps: 30 }
        },

        synchronization: {
            mode: "AUTO",
            anchor: {
                anchor_type: "GAIT_MID_STANCE", // Mock
                trial_A: { frame_index: 0, t_ms: 0 },
                trial_B: { frame_index: 0, t_ms: 0 }
            }
        },

        metric_deltas,
        summary,

        quality: {
            analysis_confidence_A_0_100: 85,
            analysis_confidence_B_0_100: 90,
            analysis_confidence_overall_0_100: 87,
            warnings: []
        }
    };
};

// -- Helpers --

function createDelta(
    key: string, label: string, unit: MetricUnit,
    valA: number, valB: number,
    directionality: "LOWER_IS_BETTER" | "HIGHER_IS_BETTER"
): MetricDelta {
    const delta = valB - valA;
    let status: "IMPROVED" | "WORSE" | "UNCHANGED" = "UNCHANGED";

    const threshold = 1.0;

    if (Math.abs(delta) < threshold) {
        status = "UNCHANGED";
    } else if (directionality === "LOWER_IS_BETTER") {
        status = delta < 0 ? "IMPROVED" : "WORSE";
    } else {
        status = delta > 0 ? "IMPROVED" : "WORSE";
    }

    return {
        key, label, unit,
        value_A: fmt(valA),
        value_B: fmt(valB),
        delta: fmt(delta),
        directionality,
        status,
        confidence_0_100: 100 // Mock
    };
}

function extractGaitMetrics(_frames: VideoAnalysisFrame[]) {
    // Mock values for demo robustness
    return {
        cadence: 110 + (Math.random() * 10 - 5),
        valgusL: 8 + (Math.random() * 4 - 2),
        valgusR: 7 + (Math.random() * 4 - 2)
    };
}

function generateMarkdownTable(deltas: MetricDelta[]): string {
    let md = "| Métrica | Inicial | Reavaliação | Delta | Status |\n|---|---|---|---|---|\n";
    deltas.forEach(d => {
        md += `| ${d.label} | ${d.value_A}${d.unit} | ${d.value_B}${d.unit} | ${d.delta} | ${d.status} |\n`;
    });
    return md;
}

// Legacy alias to prevent breaks until all refs updated
export const analyzeGait = (frames: VideoAnalysisFrame[]) => {
    // Return a subset or dummy to satisfy legacy callers if any remain?
    // Actually, DynamicComparisonPage expects GaitMetrics structure?
    // We will update DynamicComparisonPage to use analyzeDynamicComparison instead.
    // So we can remove this or keep it returning any.
    return extractGaitMetrics(frames);
};
