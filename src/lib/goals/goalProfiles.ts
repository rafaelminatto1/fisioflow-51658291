import { GoalProfile, GOAL_PROFILES_SEED } from './goalProfiles.seed';

export const goalProfiles: Record<string, GoalProfile> = GOAL_PROFILES_SEED.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
}, {} as Record<string, GoalProfile>);

export type { GoalProfile };
