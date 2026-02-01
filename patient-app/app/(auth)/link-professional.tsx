import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { updateDoc, doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthStore } from '@/store/auth';
import { useColors } from '@/hooks/useColorScheme';
import { Card, Button, Input } from '@/components';

interface Professional {
  id: string;
  name: string;
  email?: string;
  clinic_name?: string;
  specialty?: string;
}

export default function LinkProfessionalScreen() {
  const colors = useColors();
  const { user } = useAuthStore();

  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [foundProfessional, setFoundProfessional] = useState<Professional | null>(null);
  const [alreadyLinked, setAlreadyLinked] = useState(false);
  const [skipForNow, setSkipForNow] = useState(false);

  // Check if already linked
  useEffect(() => {
    checkExistingLink();
  }, []);

  const checkExistingLink = async () => {
    if (!user?.id) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.professional_id && userData.professional_name) {
          setAlreadyLinked(true);
          setFoundProfessional({
            id: userData.professional_id,
            name: userData.professional_name,
          });
        }
      }
    } catch (error) {
      console.error('Error checking link:', error);
    }
  };

  const formatInviteCode = (text: string) => {
    // Remove non-alphanumeric characters and convert to uppercase
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  };

  const handleSearchProfessional = async () => {
    const cleanCode = formatInviteCode(inviteCode);

    if (cleanCode.length < 4) {
      Alert.alert('Código inválido', 'Digite um código válido de pelo menos 4 caracteres.');
      return;
    }

    setSearching(true);
    setFoundProfessional(null);

    try {
      // Search for professional with this invite code
      const professionalsRef = collection(db, 'users');
      const q = query(
        professionalsRef,
        where('role', '==', 'professional'),
        where('invite_code', '==', cleanCode)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert(
          'Profissional não encontrado',
          'Nenhum profissional encontrado com este código. Verifique com seu fisioterapeuta.'
        );
      } else {
        const profDoc = snapshot.docs[0];
        const profData = profDoc.data();
        setFoundProfessional({
          id: profDoc.id,
          name: profData.name || profData.displayName || 'Profissional',
          email: profData.email,
          clinic_name: profData.clinic_name,
          specialty: profData.specialty,
        });
      }
    } catch (error) {
      console.error('Error searching professional:', error);
      Alert.alert('Erro', 'Não foi possível buscar o profissional. Tente novamente.');
    } finally {
      setSearching(false);
    }
  };

  const handleLinkProfessional = async () => {
    if (!foundProfessional || !user?.id) return;

    setLoading(true);

    try {
      // Update user document with professional info
      await updateDoc(doc(db, 'users', user.id), {
        professional_id: foundProfessional.id,
        professional_name: foundProfessional.name,
        updated_at: new Date(),
      });

      // Also add patient to professional's patients list
      const profRef = doc(db, 'users', foundProfessional.id);
      const profDoc = await getDoc(profRef);

      if (profDoc.exists()) {
        const profData = profDoc.data();
        const patients = profData.patients || [];
        if (!patients.includes(user.id)) {
          await updateDoc(profRef, {
            patients: [...patients, user.id],
          });
        }
      }

      Alert.alert(
        'Vinculado com sucesso!',
        `Você agora está conectado com ${foundProfessional.name}.`,
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Error linking professional:', error);
      Alert.alert('Erro', 'Não foi possível vincular ao profissional. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Pular vinculação?',
      'Você pode vincular seu perfil a um profissional mais tarde nas configurações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pular',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="people" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Vincular Profissional</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {alreadyLinked
                ? 'Você já está conectado com um profissional'
                : 'Digite o código fornecido pelo seu fisioterapeuta'}
            </Text>
          </View>

          {alreadyLinked && foundProfessional ? (
            <Card style={styles.linkedCard}>
              <View style={styles.linkedHeader}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
                <Text style={[styles.linkedTitle, { color: colors.text }]}>
                  Já Conectado
                </Text>
              </View>
              <Text style={[styles.linkedText, { color: colors.textSecondary }]}>
                Você está conectado com:
              </Text>
              <View style={[styles.professionalPreview, { backgroundColor: colors.surface }]}>
                <Text style={[styles.professionalName, { color: colors.text }]}>
                  {foundProfessional.name}
                </Text>
              </View>
              <Button
                title="Continuar para o App"
                onPress={() => router.replace('/(tabs)')}
                style={styles.continueButton}
              />
            </Card>
          ) : (
            <>
              {/* Search Card */}
              <Card style={styles.searchCard}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Código do Convite
                </Text>
                <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
                  Peça o código de 6 dígitos ao seu fisioterapeuta
                </Text>

                <View style={styles.inputRow}>
                  <Input
                    placeholder="XXXXXX"
                    value={inviteCode}
                    onChangeText={(text) => {
                      setInviteCode(formatInviteCode(text));
                      if (formatInviteCode(text).length >= 4) {
                        handleSearchProfessional();
                      }
                    }}
                    onSubmitEditing={handleSearchProfessional}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  {searching ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : null}
                </View>

                {foundProfessional && (
                  <View style={[styles.foundCard, { backgroundColor: colors.surface, borderColor: colors.success }]}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    <View style={styles.foundInfo}>
                      <Text style={[styles.foundName, { color: colors.text }]}>
                        {foundProfessional.name}
                      </Text>
                      {foundProfessional.specialty && (
                        <Text style={[styles.foundDetail, { color: colors.textSecondary }]}>
                          {foundProfessional.specialty}
                        </Text>
                      )}
                      {foundProfessional.clinic_name && (
                        <Text style={[styles.foundDetail, { color: colors.textSecondary }]}>
                          {foundProfessional.clinic_name}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </Card>

              {/* Instructions Card */}
              <Card style={styles.instructionsCard}>
                <Text style={[styles.instructionTitle, { color: colors.text }]}>
                  Como obter o código?
                </Text>
                <View style={styles.instructionList}>
                  <InstructionStep
                    number={1}
                    text="Entre em contato com seu fisioterapeuta"
                    colors={colors}
                  />
                  <InstructionStep
                    number={2}
                    text="Solicite o código de convite do app"
                    colors={colors}
                  />
                  <InstructionStep
                    number={3}
                    text="Digite o código acima para vincular"
                    colors={colors}
                  />
                </View>
              </Card>

              {/* Actions */}
              {foundProfessional ? (
                <Button
                  title="Confirmar Vinculação"
                  onPress={handleLinkProfessional}
                  loading={loading}
                  style={styles.linkButton}
                />
              ) : null}

              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                  Pular por agora
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InstructionStep({
  number,
  text,
  colors,
}: {
  number: number;
  text: string;
  colors: any;
}) {
  return (
    <View style={styles.instructionItem}>
      <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={[styles.instructionText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  linkedCard: {
    padding: 24,
    alignItems: 'center',
  },
  linkedHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  linkedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },
  linkedText: {
    fontSize: 14,
    marginBottom: 16,
  },
  professionalPreview: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 24,
    width: '100%',
  },
  searchCard: {
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
  },
  foundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 12,
  },
  foundInfo: {
    flex: 1,
  },
  foundName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  foundDetail: {
    fontSize: 13,
  },
  instructionsCard: {
    padding: 20,
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  instructionList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
  },
  linkButton: {
    marginTop: 8,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
  },
});
