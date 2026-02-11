"use strict";
/**
 * Gamification System Types
 *
 * Types for patient gamification including XP, levels, achievements, quests, and challenges.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.achievementRequirementSchema = exports.gamificationProfileSchema = exports.completeQuestParamsSchema = exports.awardXpParamsSchema = void 0;
exports.isValidAchievementRequirement = isValidAchievementRequirement;
exports.parseAchievementRequirements = parseAchievementRequirements;
// ============================================================================
// COMMON TYPES
// ============================================================================
/**
 * Reasons for XP transactions - used for tracking and analytics
 */
const zod_1 = require("zod");
// ============================================================================
// ZOD SCHEMAS
// ============================================================================
/**
 * Zod schema for validating XP transaction parameters
 */
exports.awardXpParamsSchema = zod_1.z.object({
    amount: zod_1.z.number().int().min(0),
    reason: zod_1.z.enum([
        'session_completed',
        'daily_quest',
        'achievement_unlocked',
        'challenge_completion',
        'streak_bonus',
        'level_up',
        'manual_adjustment',
        'atendido',
    ]),
    description: zod_1.z.string().optional()
});
/**
 * Zod schema for validating quest completion parameters
 */
exports.completeQuestParamsSchema = zod_1.z.object({
    questId: zod_1.z.string().uuid()
});
/**
 * Zod schema for validating gamification profile
 */
exports.gamificationProfileSchema = zod_1.z.object({
    patient_id: zod_1.z.string().uuid(),
    current_xp: zod_1.z.number().int().min(0),
    level: zod_1.z.number().int().min(1),
    current_streak: zod_1.z.number().int().min(0),
    longest_streak: zod_1.z.number().int().min(0),
    total_points: zod_1.z.number().int().min(0),
    last_activity_date: zod_1.z.string().datetime().nullable()
});
/**
 * Zod schema for validating achievement requirement
 */
exports.achievementRequirementSchema = zod_1.z.object({
    type: zod_1.z.enum(['streak', 'sessions', 'level', 'quests', 'custom']),
    count: zod_1.z.number().int().min(1),
    description: zod_1.z.string().optional()
});
/**
 * Type guard to check if a value is a valid AchievementRequirement
 */
function isValidAchievementRequirement(value) {
    return exports.achievementRequirementSchema.safeParse(value).success;
}
/**
 * Type guard to check if requirements is a string (JSON) or object
 */
function parseAchievementRequirements(requirements) {
    if (typeof requirements === 'string') {
        try {
            const parsed = JSON.parse(requirements);
            return exports.achievementRequirementSchema.parse(parsed);
        }
        catch {
            return { type: 'custom', count: 0 };
        }
    }
    return exports.achievementRequirementSchema.parse(requirements);
}
//# sourceMappingURL=gamification.js.map