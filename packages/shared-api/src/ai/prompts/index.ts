/**
 * AI Prompts Index
 *
 * Centralized export of all AI prompts for FisioFlow.
 *
 * @module ai/prompts
 */

export * from './clinical-prompts';
export * from './exercise-prompts';

/**
 * All remote config keys for AI prompts
 */
import { CLINICAL_PROMPT_KEYS } from './clinical-prompts';
import { EXERCISE_PROMPT_KEYS } from './exercise-prompts';

export const AI_PROMPT_REMOTE_CONFIG_KEYS = {
  ...CLINICAL_PROMPT_KEYS,
  ...EXERCISE_PROMPT_KEYS,
} as const;
