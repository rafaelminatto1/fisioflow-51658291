import { Stack } from "expo-router";

export default function BiomecanicaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F7F9FB" } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tests" />
      <Stack.Screen
        name="capture"
        options={{ presentation: "fullScreenModal", animation: "fade" }}
      />
      <Stack.Screen name="analysis" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="comparison" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="report" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
