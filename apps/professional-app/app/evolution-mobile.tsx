import { useLocalSearchParams, Stack } from "expo-router";
import { EvolutionMobileScreen } from "@/components/evolution/EvolutionMobileScreen";

export default function EvolutionMobileRoute() {
  const params = useLocalSearchParams();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EvolutionMobileScreen
        patientId={params.patientId as string | undefined}
        patientName={params.patientName as string | undefined}
        appointmentId={params.appointmentId as string | undefined}
      />
    </>
  );
}
