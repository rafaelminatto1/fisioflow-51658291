import { z } from 'zod';

export default z.object({ "schema_version": z.literal("dynamic_compare@1.0.0"), "compare_type": z.literal("DYNAMIC_COMPARE"), "created_at": z.string().datetime({ offset: true }), "test_type": z.any(), "trial_A": z.any(), "trial_B": z.any(), "synchronization": z.any(), "metric_deltas": z.array(z.any()), "summary": z.any(), "quality": z.any() }).describe("Schema for dynamic comparison metrics between two trials (A vs B).")
