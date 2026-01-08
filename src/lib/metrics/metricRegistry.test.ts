import { metricRegistry } from './metricRegistry';
import { MetricRegistrySchema } from './metricRegistry.zod';
import { evaluateDeltaStatus } from './deltaEngine';
import { evaluateGoals } from '../goals/goalEngine';
import { goalProfiles } from '../goals/goalProfiles';
import { DynamicCompareMetrics } from '@/generated/types/dynamic_compare_metrics';

describe('Metric Registry', () => {
    it('should be valid against the schema', () => {
        expect(() => MetricRegistrySchema.parse(metricRegistry)).not.toThrow();
    });

    it('should have standard gait metrics', () => {
        expect(metricRegistry['gait.cadence']).toBeDefined();
        expect(metricRegistry['gait.cadence'].directionality).toBe('HIGHER_IS_BETTER');
    });
});

describe('Delta Engine', () => {
    it('should handle HIGHER_IS_BETTER', () => {
        const res = evaluateDeltaStatus({
            valueA: 10, valueB: 15, delta: 5,
            directionality: 'HIGHER_IS_BETTER'
        });
        expect(res).toBe('IMPROVED');
    });

    it('should handle LOWER_IS_BETTER', () => {
        const res = evaluateDeltaStatus({
            valueA: 10, valueB: 15, delta: 5,
            directionality: 'LOWER_IS_BETTER'
        });
        expect(res).toBe('WORSE');
    });

    it('should respect thresholds', () => {
        // Delta 0.5, Threshold 1.0 => Unchanged
        const res = evaluateDeltaStatus({
            valueA: 10, valueB: 10.5, delta: 0.5,
            directionality: 'HIGHER_IS_BETTER',
            unchangedAbs: 1.0
        });
        expect(res).toBe('UNCHANGED');
    });
});

describe('Goal Engine', () => {
    const mockCompare: DynamicCompareMetrics = {
        schema_version: "dynamic_compare@1.0.0",
        compare_type: "DYNAMIC_COMPARE",
        created_at: "",
        test_type: "GAIT",
        trial_A: { label: "A", captured_at: "" },
        trial_B: { label: "B", captured_at: "" },
        synchronization: { mode: "AUTO", anchor: { anchor_type: "X" } },
        metric_deltas: [
            {
                key: "squat.knee_valgus_deg_peak_L",
                label: "Valgus",
                value_A: 20,
                value_B: 10, // Improved by 50%
                delta: -10,
                directionality: "LOWER_IS_BETTER",
                status: "IMPROVED"
            }
        ],
        summary: {},
        quality: { analysis_confidence_overall_0_100: 90 }
    } as any;

    it('should evaluate ACL profile correctly', () => {
        const profile = goalProfiles['acl_rts_readiness'];
        const result = evaluateGoals(
            mockCompare,
            profile,
            { "prom.acl_rsi_0_100": 70 } // Target is > 65
        );

        const valgusTarget = result.targets.find(t => t.key === "squat.knee_valgus_deg_peak_L");
        const rsiTarget = result.targets.find(t => t.key === "prom.acl_rsi_0_100");

        expect(valgusTarget?.status).toBe('MET'); // -50% delta > 15% min
        expect(rsiTarget?.status).toBe('MET'); // 70 > 65
    });

    it('should fail if PROM is too low', () => {
        const profile = goalProfiles['acl_rts_readiness'];
        const result = evaluateGoals(
            mockCompare,
            profile,
            { "prom.acl_rsi_0_100": 50 }
        );
        const rsiTarget = result.targets.find(t => t.key === "prom.acl_rsi_0_100");
        expect(rsiTarget?.status).toBe('NOT_MET');
    });
});
