import React from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ClinicalTestVerifierCamera } from "@/components/clinical/tests/ClinicalTestVerifierCamera";
import { toast } from "@/lib/toast";

export default function ClinicalTestAIScreen() {
  const { testId, testName } = useLocalSearchParams<{ testId: string; testName: string }>();
  const router = useRouter();

  const handleValidationComplete = (result: any) => {
    toast.success(`Teste validado: ${result.qualityScore}% de qualidade!`);
    // Aqui poderíamos salvar o resultado no banco
    setTimeout(() => router.back(), 2000);
  };

  return (
    <View style={styles.container}>
      <ClinicalTestVerifierCamera
        testId={testId || "custom"}
        testName={testName || "Teste Clínico"}
        onValidationComplete={handleValidationComplete}
        onClose={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
});
