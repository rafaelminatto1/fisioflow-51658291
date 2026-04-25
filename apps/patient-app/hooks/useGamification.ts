import { useQuery } from "@tanstack/react-query";
import { gamificationApi } from "@/lib/api";

export function useGamification() {
  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["gamification-profile"],
    queryFn: () => gamificationApi.getProfile(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });

  const xpPerLevel = profile?.nextLevelXp || 1000;
  const currentLevel = profile?.level || 1;
  const currentXp = profile?.xp || 0;
  const progressPercentage = (currentXp / xpPerLevel) * 100;

  return {
    profile,
    isLoading,
    currentLevel,
    currentXp,
    xpPerLevel,
    progressPercentage,
    refetch,
  };
}
