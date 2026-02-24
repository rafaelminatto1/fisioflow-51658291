/**
 * ExerciseAiScreen - Tela de Exercício com Inteligência Artificial
 * 
 * Esta é a tela que o paciente usa para realizar o exercício com
 * biofeedback em tempo real e contagem automática.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { AnalysisEngine } from '../../lib/ai/analysisEngine';
import { PoseFeedbackOverlay } from './PoseFeedbackOverlay';
import { ExerciseType, AnalysisResult } from '../../types/ai/pose';

const { width, height } = Dimensions.get('window');

export const ExerciseAiScreen = ({ exerciseType, onComplete }: { exerciseType: ExerciseType, onComplete: (res: any) => void }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const engine = useRef(new AnalysisEngine(exerciseType));

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleStart = () => {
    setIsRecording(true);
    // Aqui iniciaria o loop de processamento de frames
  };

  const handleStop = () => {
    setIsRecording(false);
    onComplete(result?.metrics);
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>Sem acesso à câmera</Text>;

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} type={Camera.Constants.Type.front}>
        <View style={styles.overlay}>
          {/* Contador de Repetições */}
          <View style={styles.header}>
            <Text style={styles.repCount}>{result?.repCount || 0}</Text>
            <Text style={styles.repLabel}>REPETIÇÕES</Text>
          </View>

          {/* Overlay de Pose (Esqueleto) */}
          <PoseFeedbackOverlay 
            landmarks={result?.pose.landmarks || []} 
            width={width} 
            height={height} 
          />

          {/* Feedback Textual */}
          <View style={styles.footer}>
            {result?.feedback?.map((f, i) => (
              <Text key={i} style={styles.feedbackText}>{f}</Text>
            ))}
            
            <TouchableOpacity 
              style={[styles.actionButton, isRecording ? styles.stopButton : styles.startButton]} 
              onPress={isRecording ? handleStop : handleStart}
            >
              <Ionicons name={isRecording ? "stop" : "play"} size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'space-between', padding: 20 },
  header: { alignItems: 'center', marginTop: 40 },
  repCount: { fontSize: 80, fontWeight: 'bold', color: '#FFF' },
  repLabel: { fontSize: 18, color: '#FFF', letterSpacing: 2 },
  footer: { alignItems: 'center', marginBottom: 40 },
  feedbackText: { fontSize: 24, fontWeight: '600', color: '#00FF00', marginBottom: 20, textAlign: 'center' },
  actionButton: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  startButton: { backgroundColor: '#007AFF' },
  stopButton: { backgroundColor: '#FF3B30' }
});
