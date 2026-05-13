import {
  Award,
  BadgeCheck,
  CheckCheck,
  Circle,
  Clock,
  Flame,
  Info,
  Lock,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { withIconErrorBoundary } from "@/components/error/IconErrorBoundary";

export const GAMIFICATION_ICON_MAP: Record<string, LucideIcon> = {
  Award,
  BadgeCheck,
  CheckCheck,
  Circle,
  Clock,
  Flame,
  Info,
  Lock,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Ticket,
  Trophy,
  Zap,
};

export function getGamificationIcon(
  name: string | undefined,
  fallback: LucideIcon,
): React.ComponentType<any> {
  const IconComponent = name && GAMIFICATION_ICON_MAP[name] ? GAMIFICATION_ICON_MAP[name] : fallback;
  return withIconErrorBoundary(IconComponent);
}
