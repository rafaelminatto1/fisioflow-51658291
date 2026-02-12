import { useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Alert, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { functions, getRemoteValue } from '@/lib/firebase';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Props {
  patientId: string;
  onAnalysisResult: (findings: string[]) => void;
}

export function MultimodalAIAnalysis({ patientId, onAnalysisResult }: Props) {
  const { colors } = useTheme();
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Check Remote Config (default to true if not yet fetched)
  const isEnabled = getRemoteValue('enable_multimodal_ai')?.asBoolean() ?? true;

  if (!isEnabled) return null;

  const pickAndAnalyze = async (type: 'posture' | 'exam') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão negada', 'Precisamos de acesso às suas fotos para analisar exames.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (pickerResult.canceled) return;

      const uri = pickerResult.assets[0].uri;
      setPreview(uri);
      setAnalyzing(true);

      // 1. Upload to Firebase Storage
      const storage = getStorage();
      const filename = `analysis/${patientId}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      // 2. Call Genkit Flow via aiService
      const aiService = httpsCallable(functions, 'aiService');
      const { data }: any = await aiService({
        action: 'multimodalAnalysis',
        patientId,
        type,
        mediaUrl: downloadUrl,
        contentType: 'image/jpeg'
      });

      if (data) {
        setResult(data);
        onAnalysisResult(data.findings);
      }

    } catch (error) {
      console.error('AI Analysis failed:', error);
      Alert.alert('Erro na análise', 'Não foi possível completar a análise por IA.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Icon name="wand-2" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Assistente de Imagem IA</Text>
      </View>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Analise fotos de postura ou exames de imagem usando Gemini 1.5 Pro.
      </Text>

      <View style={styles.actions}>
        <Button 
          variant="outline" 
          size="sm" 
          onPress={() => pickAndAnalyze('posture')}
          loading={analyzing && !preview}
          leftIcon={<Icon name="user" size={16} color={colors.text} />}
        >
          Análise de Postura
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onPress={() => pickAndAnalyze('exam')}
          loading={analyzing && !preview}
          leftIcon={<Icon name="file-text" size={16} color={colors.text} />}
        >
          Analisar Exame
        </Button>
      </View>

      {analyzing && preview && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 8 }}>Processando com IA...</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultContainer}>
          <View style={[styles.severityBadge, { backgroundColor: result.severity === 'high' ? colors.error : colors.success }]}>
            <Text style={styles.severityText}>Severidade: {result.severity.toUpperCase()}</Text>
          </View>
          <Text style={[styles.summary, { color: colors.text }]}>{result.clinicalSummary}</Text>
          {result.findings.map((f: string, i: number) => (
            <Text key={i} style={[styles.finding, { color: colors.text }]}>• {f}</Text>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 13, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  loadingOverlay: { marginTop: 16, alignItems: 'center' },
  resultContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16 },
  severityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8 },
  severityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  summary: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  finding: { fontSize: 13, marginBottom: 4 },
});
