import { RealtimeProvider } from "@/contexts/RealtimeContext";
import { TourProvider } from "@/contexts/TourContext";
import { GamificationFeedbackProvider } from "@/contexts/GamificationFeedbackContext";
import { MobileSheetProvider } from "@/components/evolution/v3-notion/MobileBottomSheet";
import { WaitlistSlotNotificationListener } from "@/components/waitlist/WaitlistSlotNotification";

export function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileSheetProvider>
      <TourProvider>
        <GamificationFeedbackProvider>
          <RealtimeProvider>
            <WaitlistSlotNotificationListener />
            {children}
          </RealtimeProvider>
        </GamificationFeedbackProvider>
      </TourProvider>
    </MobileSheetProvider>
  );
}
