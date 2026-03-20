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
): LucideIcon {
	if (!name) return fallback;
	return GAMIFICATION_ICON_MAP[name] || fallback;
}
