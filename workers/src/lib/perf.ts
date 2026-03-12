/**
 * Lightweight Performance Tracking for Cloudflare Workers
 */
export class PerformanceTracker {
  private markers: Map<string, number> = new Map();

  start(label: string) {
    this.markers.set(label, performance.now());
  }

  end(label: string) {
    const startTime = this.markers.get(label);
    if (startTime === undefined) return;
    
    const duration = performance.now() - startTime;
    console.log(`[Perf] ${label}: ${duration.toFixed(2)}ms`);
    this.markers.delete(label);
    return duration;
  }
}

export const perf = new PerformanceTracker();
