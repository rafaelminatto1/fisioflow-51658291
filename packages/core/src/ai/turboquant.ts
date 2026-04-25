/**
 * TurboQuant.ts
 * Extreme Vector Compression (PolarQuant + QJL)
 * Implementation for FisioFlow (Edge-Native)
 */

export interface TurboQuantConfig {
  dimension: number;
  seed?: number;
}

/**
 * Deterministic Pseudo-Random Generator (LCG)
 * Used to recreate the same random signs across all instances.
 */
class LcgRandom {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
}

// 3-Bit Lloyd-Max Centroids for Normal Distribution N(0, 1)
// These map to 8 buckets: 0 to 7
const LLOYD_MAX_BOUNDARIES = [-1.334, -0.765, -0.335, 0.0, 0.335, 0.765, 1.334];
const LLOYD_MAX_CENTROIDS = [-1.748, -1.05, -0.522, -0.167, 0.167, 0.522, 1.05, 1.748];
const RESIDUAL_MAG_SQUARED = 0.148 * 0.148;

export class TurboQuant {
  private config: TurboQuantConfig;
  private paddedDimension: number;
  private hd1Signs: Float32Array;
  private hd2Signs: Float32Array;
  private static _LUT: number[][];

  constructor(config: TurboQuantConfig) {
    this.config = {
      seed: 2026, // Default seed
      ...config,
    };

    // Find next power of 2 for FWHT (e.g., 768 -> 1024)
    this.paddedDimension = Math.pow(2, Math.ceil(Math.log2(this.config.dimension)));

    const rng = new LcgRandom(this.config.seed!);
    this.hd1Signs = new Float32Array(this.paddedDimension);
    this.hd2Signs = new Float32Array(this.paddedDimension);

    for (let i = 0; i < this.paddedDimension; i++) {
      this.hd1Signs[i] = rng.next() > 0.5 ? 1 : -1;
      this.hd2Signs[i] = rng.next() > 0.5 ? 1 : -1;
    }
  }

  /**
   * In-place Fast Walsh-Hadamard Transform
   */
  private fwht(h: Float32Array): void {
    const N = h.length;
    for (let len = 1; len < N; len *= 2) {
      for (let i = 0; i < N; i += len * 2) {
        for (let j = i; j < i + len; j++) {
          const x = h[j];
          const y = h[j + len];
          h[j] = x + y;
          h[j + len] = x - y;
        }
      }
    }
  }

  /**
   * Compresses a high-dimensional vector into a compact sketch.
   * @param vector Original embedding (Float32Array)
   * @returns Compact Uint8Array (4 bits per padded dimension)
   */
  compress(vector: Float32Array | number[]): Uint8Array {
    const dim = vector.length;
    if (dim !== this.config.dimension) {
      throw new Error(`Vector dimension mismatch. Expected ${this.config.dimension}, got ${dim}`);
    }

    // 1. Zero Padding and sign flipping (HD1)
    const padded = new Float32Array(this.paddedDimension);
    for (let i = 0; i < dim; i++) {
      padded[i] = vector[i] * this.hd1Signs[i];
    }

    // 2. FWHT for PolarQuant (Implicit variance 1 if input is normalized)
    this.fwht(padded);

    const polarQuant = new Int8Array(this.paddedDimension);
    const residual = new Float32Array(this.paddedDimension);

    // 3. PolarQuant 3-bit (Magnitude/Sign mapped to buckets 0-7)
    for (let i = 0; i < this.paddedDimension; i++) {
      const val = padded[i];
      let bucket = 7;
      for (let b = 0; b < LLOYD_MAX_BOUNDARIES.length; b++) {
        if (val < LLOYD_MAX_BOUNDARIES[b]) {
          bucket = b;
          break;
        }
      }
      polarQuant[i] = bucket;
      residual[i] = val - LLOYD_MAX_CENTROIDS[bucket];
    }

    // 4. QJL 1-bit on residual
    for (let i = 0; i < this.paddedDimension; i++) {
      residual[i] *= this.hd2Signs[i];
    }
    this.fwht(residual);

    // 5. Pack into Uint8Array (4 bits: 3 bit PolarQuant + 1 bit QJL)
    const sketch = new Uint8Array(this.paddedDimension / 2);

    for (let i = 0; i < this.paddedDimension; i++) {
      const pq = polarQuant[i] & 0x07; // 3 bits
      const qjl = residual[i] >= 0 ? 0x08 : 0x00; // 1 bit
      const nibble = qjl | pq;

      if (i % 2 === 0) {
        sketch[i / 2] = nibble << 4;
      } else {
        sketch[Math.floor(i / 2)] |= nibble;
      }
    }

    return sketch;
  }

  /**
   * Pre-computed Look-Up Table (LUT) for O(1) similarity decoding.
   * Decodes Inner Product response between two quantized nibbles.
   */
  static get LUT(): number[][] {
    if (this._LUT) return this._LUT;
    this._LUT = Array.from({ length: 16 }, () => new Array(16).fill(0));

    const reconstructPq = (n: number) => LLOYD_MAX_CENTROIDS[n & 0x07];
    const qjlSign = (n: number) => ((n & 0x08) !== 0 ? 1 : -1);

    for (let n1 = 0; n1 < 16; n1++) {
      for (let n2 = 0; n2 < 16; n2++) {
        const pqScore = reconstructPq(n1) * reconstructPq(n2);
        const qjlScore = qjlSign(n1) * qjlSign(n2) * RESIDUAL_MAG_SQUARED;
        this._LUT[n1][n2] = pqScore + qjlScore;
      }
    }
    return this._LUT;
  }

  /**
   * Calculates the approximate Inner Product (Similarity) between two sketches.
   * Works gracefully directly on memory or database queried bytes.
   */
  static similarity(s1: Uint8Array, s2: Uint8Array): number {
    let score = 0;
    const len = Math.min(s1.length, s2.length);
    const lut = this.LUT;

    for (let i = 0; i < len; i++) {
      const b1 = s1[i];
      const b2 = s2[i];

      // Unpack 4-bit nibbles
      const n1a = (b1 >> 4) & 0x0f;
      const n1b = b1 & 0x0f;
      const n2a = (b2 >> 4) & 0x0f;
      const n2b = b2 & 0x0f;

      score += lut[n1a][n2a];
      score += lut[n1b][n2b];
    }

    // Denormalize by N (padded dimension corresponds to len * 2)
    return score / (len * 2);
  }
}

/**
 * Parses a Base64 string sketch back to Uint8Array.
 * Works natively in Node.js, and in React Native uses atob or buffer.
 */
export function parseTurboSketch(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  }

  // Fallback for browsers / environments without Buffer
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}
