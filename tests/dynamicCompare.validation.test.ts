import { describe, it, expect } from 'vitest';
import { parseDynamicCompare } from '../src/lib/validation/dynamicCompare';

const VALID_PAYLOAD = {
    schema_version: "dynamic_compare@1.0.0",
    compare_type: "DYNAMIC_COMPARE",
    created_at: "2025-01-01T00:00:00Z",
    test_type: "GAIT",
    trial_A: { label: "A", captured_at: "2025-01-01T00:00:00Z" },
    trial_B: { label: "B", captured_at: "2025-01-01T00:00:00Z" },
    synchronization: { mode: "AUTO", anchor: { anchor_type: "X" } },
    metric_deltas: [
        { key: "k1", label: "L1", directionality: "HIGHER_IS_BETTER", status: "IMPROVED", value_A: 10, value_B: 20, delta: 10 }
    ],
    summary: {},
    quality: { analysis_confidence_overall_0_100: 90 }
};

describe('Dynamic Compare Validation', () => {
    it('should validate a correct payload', () => {
        const result = parseDynamicCompare(VALID_PAYLOAD);
        expect(result.test_type).toBe('GAIT');
        expect(result.metric_deltas[0].delta).toBe(10);
    });

    it('should fail if required fields are missing', () => {
        const invalid = { ...VALID_PAYLOAD };
        // @ts-ignore
        delete invalid.schema_version;

        expect(() => parseDynamicCompare(invalid)).toThrow(/AJV Validation Failed/);
    });

    it('should fail if types are incorrect (Zod check)', () => {
        const invalid = { ...VALID_PAYLOAD, quality: { analysis_confidence_overall_0_100: "HIGH" } }; // string instead of number

        expect(() => parseDynamicCompare(invalid)).toThrow(); // AJV or Zod will catch this type mismatch
    });
});
