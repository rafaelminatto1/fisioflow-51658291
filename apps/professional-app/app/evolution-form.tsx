import { useState, useEffect, useRef, useCallback } from 'react';
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
import { SOAPForm } from '@/components/evolution/SOAPForm';
import { PainLevelSlider } from '@/components/evolution/PainLevelSlider';
import { PhotoUpload } from '@/components/evolution/PhotoUpload';
import { FillingStyleToggle, FillingMode } from '@/components/evolution/FillingStyleToggle';
import { NotionForm } from '@/components/evolution/NotionForm';
import { TiptapForm } from '@/components/evolution/TiptapForm';
import { fetchApi } from '@/lib/api';

export default function EvolutionFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();

  const rawPatientId = params.patientId as string;
  const patientId = rawPatientId && rawPatientId !== 'undefined' ? rawPatientId : '';
  const patientName = params.patientName as string || 'Paciente';
  const rawAppointmentId = params.appointmentId as string | undefined;
  const appointmentId = rawAppointmentId && rawAppointmentId !== 'undefined' ? rawAppointmentId : undefined;

  const { success, error: hapticError } = useHaptics();


  // Form state
  const [mode, setMode] = useState<FillingMode>('SOAP');
  const [subjective, setSubjective] = useState('');
  const [objective, setObjective] = useState('');
  const [assessment, setAssessment] = useState('');
  const [plan, setPlan] = useState('');
  const [freeContent, setFreeContent] = useState('');
  const [painLevel, setPainLevel] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [autoSaveErrorDetail, setAutoSaveErrorDetail] = useState<string | null>(null);
  const savedEvolutionId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Generation state
  const [generatingSOAP, setGeneratingSOAP] = useState(false);
  const [generatedSuggestions, setGeneratedSuggestions] = useState<string[]>([]);

  // Load existing draft on mount
  useEffect(() => {
    if (!patientId) return;
    const fetchDraft = async () => {
      try {
        let url = `/api/sessions?patientId=${patientId}&status=draft&limit=1`;
        if (appointmentId) {
          url += `&appointmentId=${appointmentId}`;
        }
        const res = await fetchApi<{ data: any[] }>(url);
        const draft = res.data?.[0];
        if (draft && !savedEvolutionId.current) {
          savedEvolutionId.current = draft.id;
          const subj = draft.subjective || '';
          const obj = draft.objective || '';
          const ass = draft.assessment || '';
          const pln = draft.plan || '';
          
          setSubjective(subj);
          setObjective(obj);
          setAssessment(ass);
          setPlan(pln);
          setFreeContent(ass); // Also populate freeContent in case it's Notion
          setPainLevel(draft.pain_level || 0);

          // Guess the mode: if only assessment is filled, it's likely Notion or Tiptap
          if (!subj && !obj && !pln && ass) {
            setMode('Notion');
          }
        }
      } catch (err) {
        console.error('[EvolutionForm] Error fetching draft:', err);
      }
    };
    fetchDraft();
  }, [patientId, appointmentId]);

  // Auto-save debounced — cria na primeira vez, atualiza nas seguintes
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const hasContent = mode === 'SOAP'
        ? (subjective.trim() || objective.trim() || assessment.trim() || plan.trim())
        : freeContent.trim();
      if (!hasContent || !patientId) return;

      setAutoSaveStatus('saving');
      setAutoSaveErrorDetail(null);
      try {
        const body: Record<string, any> = {
          patient_id: patientId,
          appointment_id: appointmentId ?? null,
          record_date: new Date().toISOString().split('T')[0],
          subjective: mode === 'SOAP' ? subjective.trim() : '',
          objective: mode === 'SOAP' ? objective.trim() : '',
          assessment: mode === 'SOAP' ? assessment.trim() : freeContent.trim(),
          plan: mode === 'SOAP' ? plan.trim() : '',
          pain_level: painLevel,
        };

        if (savedEvolutionId.current) {
          body.recordId = savedEvolutionId.current;
        }

        const res = await fetchApi<{ data: { id: string } }>('/api/sessions/autosave', {
          method: 'POST',
          data: body,
        });
        savedEvolutionId.current = res.data?.id ?? savedEvolutionId.current;
        setAutoSaveStatus('saved');
      } catch (err: any) {
        setAutoSaveStatus('error');
        const technicalDetail = [
          err?.message,
          err?.status ? `status=${err.status}` : null,
          err?.endpoint ? `endpoint=${err.endpoint}` : null,
        ].filter(Boolean).join(' | ');
        setAutoSaveErrorDetail(technicalDetail || null);
        console.error('[AutoSave]', err);
      }
    }, 2000);
  }, [mode, subjective, objective, assessment, plan, freeContent, patientId, appointmentId, painLevel]);

  // Carrega sessão existente no mount (para restaurar conteúdo após sair e voltar)
  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      try {
        const qParams: Record<string, string> = { patientId, status: 'draft', limit: '1' };
        if (appointmentId) qParams.appointmentId = appointmentId;
        const res = await fetchApi<{ data: Array<Record<string, any>> }>(
          '/api/sessions',
          { params: qParams }
        );
        const session = res.data?.[0];
        if (!session) return;
        savedEvolutionId.current = session.id;
        const hasSoap = session.subjective || session.objective || session.plan;
        if (hasSoap) {
          setMode('SOAP');
          setSubjective(session.subjective || '');
          setObjective(session.objective || '');
          setAssessment(session.assessment || '');
          setPlan(session.plan || '');
        } else if (session.assessment) {
          setFreeContent(session.assessment);
        }
        if (session.pain_level != null) setPainLevel(Number(session.pain_level));
      } catch {
        // silencioso — começa em branco se falhar
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // apenas no mount

  // Trigger auto-save on content changes
  useEffect(() => {
    triggerAutoSave();
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [subjective, objective, assessment, plan, freeContent, painLevel, photos, mode, triggerAutoSave]);

  // Generate SOAP with AI — calls real Workers AI endpoint
  const handleGenerateWithAI = async () => {
    setGeneratingSOAP(true);
    try {
      const data = await fetchApi<any>('/api/ai/soap-suggestions', {
        method: 'POST',
        data: {
          patientId,
          appointmentId,
          painLevel,
          mode,
          context: mode === 'SOAP'
            ? { subjective, objective, assessment, plan }
            : { freeContent },
        },
      });

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
      hapticError();
      Alert.alert('Erro', err.message || 'Não foi possível gerar com IA');
    } finally {
      setGeneratingSOAP(false);
    }
  };


  const autoSaveLabel =
    autoSaveStatus === 'saving' ? 'Salvando...' :
    autoSaveStatus === 'saved'  ? 'Salvo automaticamente' :
    autoSaveStatus === 'error'  ? 'Erro ao salvar' : '';

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

        {/* Auto-save status indicator */}
        {autoSaveLabel ? (
          <View style={styles.autoSaveContainer}>
            <View style={styles.autoSaveRow}>
              {autoSaveStatus === 'saving' && <ActivityIndicator size="small" color={colors.textSecondary} />}
              {autoSaveStatus === 'saved' && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
              {autoSaveStatus === 'error' && <Ionicons name="alert-circle" size={16} color={colors.error ?? '#EF4444'} />}
              <Text style={[styles.autoSaveText, {
                color: autoSaveStatus === 'error' ? (colors.error ?? '#EF4444') :
                       autoSaveStatus === 'saved' ? '#10B981' : colors.textSecondary
              }]}>{autoSaveLabel}</Text>
            </View>
            {autoSaveStatus === 'error' && autoSaveErrorDetail ? (
              <Text style={[styles.autoSaveErrorDetail, { color: colors.textSecondary }]}>
                {autoSaveErrorDetail}
              </Text>
            ) : null}
          </View>
        ) : null}
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
  autoSaveContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  autoSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  autoSaveText: {
    fontSize: 13,
  },
  autoSaveErrorDetail: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
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
