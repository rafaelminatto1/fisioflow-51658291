import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { TourProvider } from "@/contexts/TourContext";
import { GamificationFeedbackProvider } from "@/contexts/GamificationFeedbackContext";
import { MobileSheetProvider } from "@/components/evolution/v3-notion/MobileBottomSheet";

export function AuthenticatedAppShell({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<MobileSheetProvider>
			<TourProvider>
				<GamificationFeedbackProvider>
					<RealtimeProvider>{children}</RealtimeProvider>
				</GamificationFeedbackProvider>
			</TourProvider>
		</MobileSheetProvider>
	);
}
