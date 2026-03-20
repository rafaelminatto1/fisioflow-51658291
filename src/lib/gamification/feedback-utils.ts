import { toast } from "sonner";
import {
	triggerXpFeedbackGlobal,
	triggerLevelUpFeedbackGlobal,
} from "@/contexts/GamificationFeedbackContext";

export const triggerGamificationFeedback = (
	type: "xp" | "level_up" | "achievement",
	data: { amount?: number; level?: number; title?: string; reason?: string },
) => {
	if (type === "xp") {
		triggerXpFeedbackGlobal(
			data.amount || 0,
			data.reason || "Atividade Concluída",
		);
	}

	if (type === "level_up") {
		triggerLevelUpFeedbackGlobal(data.level || 1);
	}

	if (type === "achievement") {
		toast.info(`CONQUISTA DESBLOQUEADA!`, {
			description: data.title,
			icon: "🏅",
			duration: 4000,
		});
	}
};
