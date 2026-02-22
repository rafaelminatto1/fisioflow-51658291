import { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useEvolutions } from '@/hooks';
import { SOAPForm } from '@/components/evolution/SOAPForm';
import { PainLevelSlider } from '@/components/evolution/PainLevelSlider';
import { PhotoUpload } from '@/components/evolution/PhotoUpload';

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
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);

  // AI Generation state
  const [generatingSOAP, setGeneratingSOAP] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<string[]>([]);

  // Generate SOAP with AI
  const handleGenerateWithAI = async () => {
    setGeneratingSOAP(true);

    // Simulate AI generation (in real implementation, call Firebase function)
    setTimeout(() => {
      const suggestions = [
        'Considerar o nível de dor atual',
        'Incluir exercícios domiciliares recomendados',
        'Revisar objetivos do tratamento',
      ];

      const generatedSOAP = {
        subjective: painLevel > 0 
          ? `Paciente relata dor nível ${painLevel}/10 na região tratada. Refere ${painLevel > 5 ? 'dificuldade significativa' : 'algum desconforto'} em atividades funcionais, mas nota melhora em relação ao início.`
          : 'Paciente relata ausência de dor no momento. Sente-se bem e motivado com o tratamento.',
        objective: 'Realizada avaliação de amplitude de movimento e força muscular. Apresenta boa estabilidade articular e controle motor durante os exercícios propostos.',
        assessment: `Evolução clínica ${painLevel > 5 ? 'dentro do esperado para o quadro álgico' : 'positiva e progressiva'}. Resposta satisfatória à conduta de hoje.`,
        plan: `Manter exercícios de fortalecimento e mobilidade. Próxima sessão: progredir carga conforme tolerância e focar em treino funcional específico.`,
      };

      setSubjective(generatedSOAP.subjective);
      setObjective(generatedSOAP.objective);
      setAssessment(generatedSOAP.assessment);
      setPlan(generatedSOAP.plan);
      setGeneratedSuggestions([
        'Focar em exercícios de core',
        'Avaliar retorno ao esporte',
        'Orientar ergonomia no trabalho',
      ]);

      success();
      Alert.alert('Sucesso', 'Evolução gerada com IA!', [
        {
          text: 'OK',
          onPress: () => setGeneratingSOAP(false),
        },
      ]);
    }, 1500);
  };

  const handleSave = async () => {
    medium();
    
    const hasContent = subjective.trim() || objective.trim() || assessment.trim() || plan.trim();
    if (!hasContent) {
      Alert.alert('Atencao', 'Preencha pelo menos um campo do SOAP para salvar.');
      hapticError();
      return;
    }

    try {
      const evolutionPayload = {
        patientId,
        appointmentId,
        date: new Date(),
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
        painLevel,
        attachments: photos,
      };

      await createEvolutionAsync(evolutionPayload as any);

      success();
      Alert.alert('Sucesso', 'Evolucao registrada com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);

    } catch (err: any) {
      hapticError();
      Alert.alert('Erro', err.message || 'Nao foi possível salvar a evolucao.');
    }
  };

  const canSave = subjective.trim() || objective.trim() || assessment.trim() || plan.trim();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nova Evolucao</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{patientName}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* SOAP Form */}
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
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={colors.text} />
                <Text style={styles.aiButtonText}>Gerar com IA</Text>
              </>
            )}
          </TouchableOpacity>
          {generatedSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsLabel}>Sugestoes:</Text>
              {generatedSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => {
                    setSubjective(subjective + ' ' + suggestion);
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
              <Text style={styles.saveButtonText}>Salvar Evolucao</Text>
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
    backgroundColor: "#8B5CF6",
    gap: 8,
  },
  aiButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
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
    borderBottomColor: "rgba(139, 92, 246, 0.1)",
  },
  suggestionText: {
    fontSize: 14,
    color: "#475569",
  },
});
