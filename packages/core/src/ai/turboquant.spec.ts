import { describe, it, expect } from 'vitest';
import { TurboQuant } from './turboquant';

describe('TurboQuant Extreme Vector Compression', () => {
    it('should initialize with power of 2 padding', () => {
        const tq = new TurboQuant({ dimension: 768, seed: 42 });
        // @ts-expect-error accessing private property for test assertion
        expect(tq.paddedDimension).toBe(1024);
    });

    it('should compress a vector to a Uint8Array of half the padded dimension', () => {
        const tq = new TurboQuant({ dimension: 768, seed: 42 });
        const vector = new Float32Array(768);
        for (let i = 0; i < 768; i++) {
            vector[i] = (Math.random() * 2 - 1);
        }
        
        const sketch = tq.compress(vector);
        expect(sketch).toBeInstanceOf(Uint8Array);
        expect(sketch.length).toBe(512); // 1024 / 2
    });

    it('should maintain similarity rankings for highly correlated vectors', () => {
        const tq = new TurboQuant({ dimension: 768, seed: 2026 });
        
        const vTarget = new Float32Array(768);
        const vSimilar = new Float32Array(768);
        const vRandom = new Float32Array(768);
        
        for (let i = 0; i < 768; i++) {
            const val = Math.random() * 2 - 1;
            vTarget[i] = val;
            // Add slight noise to simulate high correlation
            vSimilar[i] = val + (Math.random() * 0.4 - 0.2); 
            // Completely random
            vRandom[i] = Math.random() * 2 - 1; 
        }
        
        const sketchTarget = tq.compress(vTarget);
        const sketchSimilar = tq.compress(vSimilar);
        const sketchRandom = tq.compress(vRandom);
        
        const scoreSimilar = TurboQuant.similarity(sketchTarget, sketchSimilar);
        const scoreRandom = TurboQuant.similarity(sketchTarget, sketchRandom);
        
        expect(scoreSimilar).toBeGreaterThan(scoreRandom);
    });
});
