import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useEvolutions } from '@/hooks';
import { SOAPForm } from '@/components/evolution/SOAPForm';
import { PainLevelSlider } from '@/components/evolution/PainLevelSlider';
import { PhotoUpload } from '@/components/evolution/PhotoUpload';
import { FillingStyleToggle, FillingMode } from '@/components/evolution/FillingStyleToggle';
import { NotionForm } from '@/components/evolution/NotionForm';
import { TiptapForm } from '@/components/evolution/TiptapForm';

export default function EvolutionFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();

  const patientId = params.patientId as string;
  const patientName = params.patientName as string || 'Paciente';
  const appointmentId = params.appointmentId as string | undefined;

  const { medium, success, error: hapticError } = useHaptics();

  const {
    createAsync: createEvolutionAsync,
    isCreating,
  } = useEvolutions(patientId);

  // Form state
  const [mode, setMode] = useState<FillingMode>('SOAP');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [freeContent, setFreeContent] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);

  // AI Generation state
  const [generatingSOAP, setGeneratingSOAP] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<string[]>([]);

  // Generate SOAP with AI — calls real Workers AI endpoint
  const handleGenerateWithAI = async () => {
    setGeneratingSOAP(true);
    try {
      const { authApi } = await import('@/lib/auth-api');
      const { config } = await import('@/lib/config');
      const token = await authApi.getToken();
      if (!token) throw new Error('Sessão expirada');

      const res = await fetch(`${config.apiUrl}/api/ai/soap-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          appointmentId,
          painLevel,
          mode,
          context: mode === 'SOAP'
            ? { subjective, objective, assessment, plan }
            : { freeContent },
        }),
      });

      if (!res.ok) throw new Error('Erro ao gerar sugestões com IA');

      const data = await res.json();

      if (mode === 'SOAP' && data.soap) {
        setSubjective(data.soap.subjective || subjective);
        setObjective(data.soap.objective || objective);
        setAssessment(data.soap.assessment || assessment);
        setPlan(data.soap.plan || plan);
      } else if (data.freeText) {
        setFreeContent(data.freeText);
      }

      if (data.suggestions?.length) {
        setGeneratedSuggestions(data.suggestions);
      }

      success();
      Alert.alert('Sucesso', 'Evolução gerada com IA!', [{ text: 'OK' }]);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível gerar com IA');
    } finally {
      setGeneratingSOAP(false);
    }
  };

  const handleSave = async () => {
    medium();
    
    const hasContent = mode === 'SOAP' 
      ? (subjective.trim() || objective.trim() || assessment.trim() || plan.trim())
      : freeContent.trim();

    if (!hasContent) {
      Alert.alert('Atenção', 'Preencha o formulário antes de salvar.');
      hapticError();
      return;
    }

    try {
      const evolutionPayload = {
        patientId,
        appointmentId,
        date: new Date(),
        // Map non-SOAP modes to assessment or combine them
        subjective: mode === 'SOAP' ? subjective.trim() : '',
        objective: mode === 'SOAP' ? objective.trim() : '',
        assessment: mode === 'SOAP' ? assessment.trim() : freeContent.trim(),
        plan: mode === 'SOAP' ? plan.trim() : '',
        painLevel,
        attachments: photos,
        metadata: {
          fillingMode: mode
        }
      };

      await createEvolutionAsync(evolutionPayload as any);

      success();
      Alert.alert('Sucesso', 'Evolução registrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);

    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível salvar a evolução.');
    }
  };

  const canSave = mode === 'SOAP' 
    ? (subjective.trim() || objective.trim() || assessment.trim() || plan.trim())
    : freeContent.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nova Evolução</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Mode Toggle */}
        <FillingStyleToggle 
          mode={mode} 
          onModeChange={setMode} 
          colors={colors} 
        />

        {/* Dynamic Form Content */}
        {mode === 'SOAP' ? (
          <SOAPForm
            subjective={subjective}
            objective={objective}
            assessment={assessment}
            plan={plan}
            onChangeSubjective={setSubjective}
            onChangeObjective={setObjective}
            onChangeAssessment={setAssessment}
            onChangePlan={setPlan}
            colors={colors}
          />
        ) : mode === 'Notion' ? (
          <NotionForm
            content={freeContent}
            onChangeContent={setFreeContent}
            colors={colors}
          />
        ) : (
          <TiptapForm
            content={freeContent}
            onChangeContent={setFreeContent}
            colors={colors}
          />
        )}

        {/* Pain Level */}
        <PainLevelSlider
          painLevel={painLevel}
          onValueChange={setPainLevel}
          colors={colors}
        />

        {/* Photo Upload */}
        <PhotoUpload
          photos={photos}
          onPhotosChange={setPhotos}
          colors={colors}
        />

        {/* AI Generation Button */}
        <View style={styles.aiButtonContainer}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleGenerateWithAI}
            disabled={generatingSOAP}
          >
            {generatingSOAP ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={styles.aiButtonText}>Gerar com IA</Text>
              </>
            )}
          </TouchableOpacity>
          {generatedSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Sugestões:</Text>
              {generatedSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    if (mode === 'SOAP') {
                      setSubjective(subjective + ' ' + suggestion);
                    } else {
                      setFreeContent(freeContent + '\n• ' + suggestion);
                    }
                  }}
                >
                  <Text style={styles.suggestionText}>• {suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: canSave ? colors.primary : colors.border },
          ]}
          onPress={handleSave}
          disabled={!canSave || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Salvar Evolução</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiButtonContainer: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#06b6d4", // Cyan 500 (Brand Primary)
    gap: 8,
  },
  aiButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    borderRadius: 8,
    padding: 12,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(6, 182, 212, 0.1)",
  },
  suggestionText: {
    fontSize: 14,
    color: "#475569",
  },
});
