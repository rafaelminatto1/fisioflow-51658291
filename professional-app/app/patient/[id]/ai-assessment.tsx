/**
 * AI Assessment Screen - Avaliação em Tempo Real com IA (Mobile)
 * 
 * Permite ao fisioterapeuta avaliar a biomecânica do paciente usando a câmera do dispositivo.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { AnalysisEngine } from '@/lib/ai/analysisEngine';
import { PoseFeedbackOverlay } from '@/components/ai/PoseFeedbackOverlay';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { useAIExercisePersistence } from '@/hooks/useAIExercisePersistence';
import { ExerciseType, createExerciseSession } from '@/types/pose';

export default function AIAssessmentScreen() {
  const { id, name } = useLocalSearchParams();
  const colors = useColors();
  const router = useRouter();
  const { medium, success: hapticSuccess } = useHaptics();
  const { playWarning } = useAudioFeedback();
  const { saveSession } = useAIExercisePersistence();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [exerciseType, setExerciseType] = useState<ExerciseType>(ExerciseType.SQUAT);
  
  // Refs
  const engineRef = useRef(new AnalysisEngine(ExerciseType.SQUAT));
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  useEffect(() => {
    if (permission?.granted) {
      engineRef.current.start();
    }
    return () => engineRef.current.stop();
  }, [permission]);

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text, marginBottom: 20 }}>Precisamos de acesso à câmera</Text>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]} 
          onPress={requestPermission}
        >
          <Text style={{ color: '#fff' }}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleFrame = (frame: any) => {
    // Nota: Em React Native real com Frame Processors (Vision Camera), 
    // rodaríamos o engine aqui. No Expo Go, simulamos.
    if (!isActive) return;
    
    // Simulação de detecção para demonstração
    const mockPose = {
      landmarks: [], // Pontos detectados
      confidence: 0.9,
      timestamp: Date.now(),
      analysisType: 'form' as any
    };
    
    const result = engineRef.current.processFrame(mockPose);
    setLastAnalysis(result);
    
    // Exemplo de feedback sonoro
    if (result.postureIssues.length > 0) {
      // Evitar spam de som
    }
  };

  const handleComplete = async () => {
    medium();
    setIsSaving(true);
    try {
      const session = createExerciseSession(
        'clinica-eval-' + Date.now(),
        id as string,
        exerciseType
      );

      // Preencher com métricas reais coletadas
      session.totalScore = lastAnalysis?.metrics?.formScore || 0;
      session.metrics = lastAnalysis?.metrics;
      session.postureIssues = lastAnalysis?.postureIssues || [];
      session.completed = true;

      await saveSession(session);
      hapticSuccess();
      Alert.alert('Sucesso', 'Avaliação salva no histórico do paciente!');
      router.back();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar sessão.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Avaliação Biofeedback</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing="front"
          onResponsiveOrientationChanged={() => {}}
        >
          {/* Overlay da IA */}
          <PoseFeedbackOverlay 
            landmarks={lastAnalysis?.pose?.landmarks || []}
            jointAngles={lastAnalysis?.jointAngles}
            width={400} // Ajustar dinamicamente
            height={600}
          />
        </CameraView>

        {/* HUD de Métricas */}
        <View style={styles.hud}>
          <View style={[styles.metricCard, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.metricLabel}>Qualidade</Text>
            <Text style={styles.metricValue}>{lastAnalysis?.metrics?.formScore || 0}%</Text>
          </View>
          
          {lastAnalysis?.postureIssues.length > 0 && (
            <View style={[styles.alertCard, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.alertText}>{lastAnalysis.postureIssues[0].description}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={[styles.controls, { backgroundColor: colors.surface }]}>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: isActive ? '#EF4444' : colors.success }]}
            onPress={() => {
              medium();
              setIsActive(!isActive);
            }}
          >
            <Ionicons name={isActive ? "stop" : "play"} size={24} color="#fff" />
            <Text style={styles.buttonText}>{isActive ? "Parar" : "Iniciar"}</Text>
          </TouchableOpacity>

          {!isActive && lastAnalysis && (
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: colors.primary, marginLeft: 12 }]}
              onPress={handleComplete}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-done" size={24} color="#fff" />
                  <Text style={styles.buttonText}>Salvar</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  hud: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: { padding: 12, borderRadius: 8, alignItems: 'center' },
  metricLabel: { color: '#ccc', fontSize: 10 },
  metricValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  alertCard: { padding: 12, borderRadius: 8, flex: 1, marginLeft: 12 },
  alertText: { color: '#fff', fontWeight: 'bold' },
  controls: {
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  button: { padding: 12, borderRadius: 8 },
});
