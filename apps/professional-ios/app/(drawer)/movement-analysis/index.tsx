import { useState, useCallback, useRef, useEffect } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Camera as CameraIcon, Video, VideoOff, Check, X, RotateCw } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { PoseAnalyzer } from '@/lib/poseAnalyzer';
import { MovementFeedback } from '@/components/MovementFeedback';

const { width, height } = Dimensions.get('window');

type CameraMode = 'idle' | 'recording' | 'analyzing' | 'result';
type AnalysisType = 'posture' | 'repetition' | 'range';

export default function MovementAnalysisScreen() {
  const { colors } = useTheme();
  const cameraRef = useRef<any>(null);
  const poseAnalyzerRef = useRef<PoseAnalyzer | null>(null);

  const [cameraMode, setCameraMode] = useState<CameraMode>('idle');
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>('posture');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [repCount, setRepCount] = useState(0);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Initialize pose analyzer
  useEffect(() => {
    if (cameraMode === 'recording') {
      poseAnalyzerRef.current = new PoseAnalyzer();
      poseAnalyzerRef.current.initialize();
    }
    return () => {
      poseAnalyzerRef.current?.cleanup();
    };
  }, [cameraMode]);

  const handleStartRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      setCameraMode('recording');
      setRepCount(0);

      // Start timer for recording duration
      const interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      // Process frames with pose detection
      if (poseAnalyzerRef.current) {
        await poseAnalyzerRef.current.startAnalysis(
          cameraRef.current,
          (result) => {
            // Real-time feedback
            if (result.repCount !== undefined) {
              setRepCount(result.repCount);
            }
          },
          analysisType
        );
      }

      // Stop recording after 30 seconds max
      setTimeout(() => {
        clearInterval(interval);
        handleStopRecording();
      }, 30000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação.');
      setIsRecording(false);
      setCameraMode('idle');
    }
  }, [analysisType]);

  const handleStopRecording = useCallback(async () => {
    if (poseAnalyzerRef.current) {
      setIsRecording(false);
      setCameraMode('analyzing');

      const result = await poseAnalyzerRef.current.stopAnalysis();

      if (result) {
        setAnalysisResult(result);
        setCameraMode('result');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Erro', 'Não foi possível analisar o movimento.');
        setCameraMode('idle');
      }
    }

    setRecordingDuration(0);
  }, []);

  const handleRetake = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnalysisResult(null);
    setRepCount(0);
    setCameraMode('idle');
  }, []);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Save result and navigate back
    router.back();
  }, [router]);

  const handleFlipCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Icon name="video-camera" size={48} color={colors.error} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Sem permissão de câmera
          </Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            É necessário permitir o acesso à câmera para realizar a análise de movimento.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Análise de Movimento</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Camera View */}
      {cameraMode !== 'result' && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef.current}
            style={styles.camera}
            facing={facing}
            enableTorch={false}
          />

          {/* Recording Overlay */}
          {isRecording && (
            <View style={styles.recordingOverlay}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingTime}>{formatTime(recordingDuration)}</Text>
              </View>

              {analysisType === 'repetition' && (
                <View style={styles.repCounter}>
                  <Text style={styles.repCount}>{repCount}</Text>
                  <Text style={styles.repLabel}>reps</Text>
                </View>
              )}
            </View>
          )}

          {/* Pose Detection Overlay */}
          {cameraMode === 'recording' && (
            <View style={styles.poseOverlay}>
              {/* Pose landmarks would be drawn here */}
            </View>
          )}
        </View>
      )}

      {/* Results */}
      {cameraMode === 'result' && analysisResult && (
        <View style={styles.resultsContainer}>
          <MovementFeedback
            result={analysisResult}
            analysisType={analysisType}
            onRetake={handleRetake}
            onConfirm={handleConfirm}
          />
        </View>
      )}

      {/* Controls */}
      {cameraMode !== 'analyzing' && cameraMode !== 'result' && (
        <View style={[styles.controls, { backgroundColor: colors.card }]}>
          {cameraMode === 'idle' && (
            <>
              {/* Analysis Type Selector */}
              <View style={styles.typeSelector}>
                <TypeButton
                  label="Postura"
                  icon="accessibility"
                  selected={analysisType === 'posture'}
                  onPress={() => setAnalysisType('posture')}
                  colors={colors}
                />
                <TypeButton
                  label="Repetições"
                  icon="repeat"
                  selected={analysisType === 'repetition'}
                  onPress={() => setAnalysisType('repetition')}
                  colors={colors}
                />
                <TypeButton
                  label="ADM"
                  icon="move"
                  selected={analysisType === 'range'}
                  onPress={() => setAnalysisType('range')}
                  colors={colors}
                />
              </View>

              <Button
                variant="primary"
                size="lg"
                onPress={handleStartRecording}
                leftIcon={<Icon name="video" size={20} color="#fff" />}
                style={styles.recordButton}
              >
                Iniciar Análise
              </Button>
            </>
          )}

          {cameraMode === 'recording' && (
            <Pressable
              onPress={handleStopRecording}
              style={[styles.stopButton, { backgroundColor: colors.error }]}
            >
              <Icon name="square" size={24} color="#fff" />
              <Text style={styles.stopButtonText}>Parar</Text>
            </Pressable>
          )}

          {/* Camera flip button */}
          {cameraMode === 'idle' && (
            <Pressable
              onPress={handleFlipCamera}
              style={[styles.flipButton, { backgroundColor: colors.card }]}
            >
              <Icon name="refresh-cw" size={20} color={colors.text} />
            </Pressable>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function TypeButton({
  label,
  icon,
  selected,
  onPress,
  colors,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeButton,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Icon name={icon as any} size={20} color={selected ? '#fff' : colors.text} />
      <Text style={[styles.typeButtonText, { color: selected ? '#fff' : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  recordingOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  recordingTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  repCounter: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  repCount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  repLabel: {
    color: '#fff',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  poseOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  controls: {
    padding: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  recordButton: {
    width: '100%',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  flipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
