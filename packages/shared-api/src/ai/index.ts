/**
 * AI Module Index
 *
 * Centralized export of all AI-powered modules for FisioFlow.
 * Uses Firebase AI Logic with Gemini models.
 *
 * @module ai
 */

// Prompts
export * from './prompts';

// Usage Monitoring
export * from './usage-monitor';

// Exercise AI
export * from './exercises';

// Clinical AI
export * from './soap-assistant';
export * from './clinical-support';

// Analysis AI
export * from './movement-analysis';
export * from './pain-analysis';
export * from './document-analysis';

// Real-time AI
export * from './voice-assistant';

// Analytics AI
export * from './predictive-analytics';
export * from './population-health';

// Optimization AI
export * from './treatment-optimizer';

/**
 * Default exports (singleton instances)
 */
export { exerciseAI } from './exercises';
export { soapAssistant } from './soap-assistant';
export { clinicalSupport } from './clinical-support';
export { movementAnalyzer } from './movement-analysis';
export { painMapAnalyzer } from './pain-analysis';
export { documentAnalyzer } from './document-analysis';
export { voiceAssistant, exerciseCoach } from './voice-assistant';
export { recoveryPredictor } from './predictive-analytics';
export { populationHealthAnalyzer } from './population-health';
export { treatmentOptimizer } from './treatment-optimizer';
export { aiUsageMonitor, trackAIRequest, checkAIRateLimit } from './usage-monitor';
