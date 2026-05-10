import React, { useState } from "react";
import { View, StyleSheet, Alert, SafeAreaView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useBiomechanicsAnalysis } from "../hooks/useBiomechanicsAnalysis";

// Componentes Modulares
import { BiomechanicsHomeView } from "../components/clinical/biomechanics/BiomechanicsHomeView";
import { BiomechanicsCameraView } from "../components/clinical/biomechanics/BiomechanicsCameraView";
import { BiomechanicsReportView } from "../components/clinical/biomechanics/BiomechanicsReportView";
import { SearchablePatientPicker } from "@/components/ui/SearchablePatientPicker";

export default function BiomechanicsScreen() {
  const colors = useColors();
  const router = useRouter();
  
  const {
    currentStep,
    setCurrentStep,
    selectedPatient,
    setSelectedPatient,
    isRecording,
    analysisResults,
    setAnalysisResults,
    startAnalysis,
    toggleRecording,
    saveReferencePose,
    resetAnalysis,
    ghostMedia,
    setAsGhost,
    patients,
  } = useBiomechanicsAnalysis();

  const [showPatientPicker, setShowPatientPicker] = useState(false);

  // Handlers de navegação e lógica
  const handleSaveReport = async (observations: string) => {
    // Lógica de persistência já integrada no hook/componente
    Alert.alert("Sucesso", "Avaliação salva com sucesso no prontuário.");
    resetAnalysis();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Roteamento de Telas */}
      {currentStep === "home" && (
        <BiomechanicsHomeView
          selectedPatient={selectedPatient}
          onSelectPatient={() => setShowPatientPicker(true)}
          onStartAnalysis={startAnalysis}
        />
      )}

      {currentStep === "capture" && (
        <BiomechanicsCameraView
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
          onPoseDetected={saveReferencePose}
          onClose={() => setCurrentStep("home")}
          ghostMedia={ghostMedia}
        />
      )}

      {currentStep === "report" && (
        <BiomechanicsReportView
          result={analysisResults}
          onSave={handleSaveReport}
          onClose={resetAnalysis}
        />
      )}

      {/* Modais Auxiliares */}
      <SearchablePatientPicker
        visible={showPatientPicker}
        onClose={() => setShowPatientPicker(false)}
        onSelect={(patient) => {
          setSelectedPatient(patient);
          setShowPatientPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
