import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { DatePicker } from '@/components/DatePicker';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';
import { formatCPF, formatPhone, isValidCPF } from '@/lib/utils';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function NewPatientScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();

  const [loading, saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Personal info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [gender, setGender] = useState<'masculino' | 'feminino' | 'outro'>('');

  // Address
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Emergency contact
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Clinical info
  const [mainCondition, setMainCondition] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [insurancePlan, setInsurancePlan] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!email.trim() && !phone.trim()) {
      newErrors.contact = 'Email ou telefone é obrigatório';
    }
    if (!birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    }
    if (!gender) {
      newErrors.gender = 'Selecione o gênero';
    }
    if (cpf && !isValidCPF(cpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    if (!mainCondition.trim()) {
      newErrors.mainCondition = 'Condição principal é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, email, phone, birthDate, gender, cpf, mainCondition]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      HapticFeedback.error();
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setSaving(true);
      HapticFeedback.medium();

      const patientId = doc(collection(db, 'patients')).id;

      await setDoc(doc(db, 'patients', patientId), {
        id: patientId,
        name: name.trim(),
        full_name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        cpf: cpf.trim() || null,
        birth_date: format(birthDate!, 'yyyy-MM-dd'),
        birthDate: format(birthDate!, 'yyyy-MM-dd'),
        gender,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip_code: zipCode.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        emergency_phone: emergencyPhone.trim() || null,
        medicalHistory: medicalHistory.trim() || null,
        mainCondition: mainCondition.trim(),
        status: 'Inicial',
        progress: 0,
        insurancePlan: insurancePlan.trim() || null,
        insurance_number: insuranceNumber.trim() || null,
        organization_id: profile?.organization_id || null,
        created_by: profile?.id,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      HapticFeedback.success();
      Alert.alert('Sucesso', 'Paciente cadastrado com sucesso!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/patients/${patientId}`),
        },
      ]);
    } catch (error) {
      console.error('Error saving patient:', error);
      HapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível cadastrar o paciente.');
    } finally {
      setSaving(false);
    }
  }, [name, email, phone, birthDate, gender, cpf, address, city, state, zipCode, emergencyContact, emergencyPhone, medicalHistory, mainCondition, insurancePlan, insuranceNumber, profile, validate, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Novo Paciente</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="user" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Dados Pessoais</Text>
            </View>

            <Card style={styles.card}>
              <FormField
                label="Nome completo *"
                placeholder="Digite o nome completo"
                value={name}
                onChangeText={setName}
                error={errors.name}
                colors={colors}
                autoFocus
              />

              <FormField
                label="Email"
                placeholder="email@exemplo.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                colors={colors}
              />

              <View style={styles.row}>
                <FormField
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChangeText={(text) => setPhone(formatPhone(text))}
                  keyboardType="phone-pad"
                  error={errors.contact}
                  style={styles.half}
                  colors={colors}
                />

                <FormField
                  label="CPF"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChangeText={(text) => setCpf(formatCPF(text))}
                  keyboardType="number-pad"
                  error={errors.cpf}
                  style={styles.half}
                  colors={colors}
                />
              </View>

              <FormField
                label="Data de Nascimento *"
                placeholder="Selecione a data"
                value={birthDate ? format(birthDate, 'dd/MM/yyyy') : ''}
                onPress={() => setShowDatePicker(true)}
                error={errors.birthDate}
                showPicker
                colors={colors}
              />

              <View style={styles.row}>
                <Text style={[styles.label, { color: colors.text }]}>Gênero *</Text>
              </View>
              <View style={styles.genderOptions}>
                {(['masculino', 'feminino', 'outro'] as const).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      HapticFeedback.selection();
                      setGender(option);
                    }}
                    style={({ pressed }) => [
                      styles.genderOption,
                      {
                        backgroundColor: gender === option ? colors.primary : colors.card,
                        borderColor: gender === option ? colors.primary : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        { color: gender === option ? '#fff' : colors.text },
                      ]}
                    >
                      {option === 'masculino' ? 'Masculino' : option === 'feminino' ? 'Feminino' : 'Outro'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {errors.gender && <Text style={[styles.errorText, { color: colors.error }]}>{errors.gender}</Text>}
            </Card>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="map-pin" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Endereço</Text>
            </View>

            <Card style={styles.card}>
              <FormField
                label="CEP"
                placeholder="00000-000"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="number-pad"
                colors={colors}
              />

              <FormField
                label="Endereço"
                placeholder="Rua, número, complemento"
                value={address}
                onChangeText={setAddress}
                colors={colors}
              />

              <View style={styles.row}>
                <FormField
                  label="Cidade"
                  placeholder="Nome da cidade"
                  value={city}
                  onChangeText={setCity}
                  style={styles.half}
                  colors={colors}
                />

                <FormField
                  label="Estado"
                  placeholder="UF"
                  value={state}
                  onChangeText={setState}
                  maxLength={2}
                  style={styles.half}
                  colors={colors}
                />
              </View>
            </Card>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="phone" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Contato de Emergência</Text>
            </View>

            <Card style={styles.card}>
              <FormField
                label="Nome do contato"
                placeholder="Nome completo"
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                colors={colors}
              />

              <FormField
                label="Telefone"
                placeholder="(11) 99999-9999"
                value={emergencyPhone}
                onChangeText={(text) => setEmergencyPhone(formatPhone(text))}
                keyboardType="phone-pad"
                colors={colors}
              />
            </Card>
          </View>

          {/* Clinical Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="stethoscope" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Informações Clínicas</Text>
            </View>

            <Card style={styles.card}>
              <FormField
                label="Condição Principal *"
                placeholder="Ex: Lombalgia, lesão no ombro..."
                value={mainCondition}
                onChangeText={setMainCondition}
                error={errors.mainCondition}
                colors={colors}
              />

              <View style={styles.fieldContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Histórico Médico</Text>
                <TextInput
                  style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Doenças preexistentes, cirurgias, alergias..."
                  placeholderTextColor={colors.textSecondary}
                  value={medicalHistory}
                  onChangeText={setMedicalHistory}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </Card>
          </View>

          {/* Insurance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="credit-card" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Convênio</Text>
            </View>

            <Card style={styles.card}>
              <FormField
                label="Plano de Saúde"
                placeholder="Nome do plano"
                value={insurancePlan}
                onChangeText={setInsurancePlan}
                colors={colors}
              />

              <FormField
                label="Número da Carteira"
                placeholder="0000000000"
                value={insuranceNumber}
                onChangeText={setInsuranceNumber}
                keyboardType="number-pad"
                colors={colors}
              />
            </Card>
          </View>

          {/* Save Button */}
          <Button
            variant="primary"
            size="lg"
            onPress={handleSave}
            loading={saving}
            style={styles.saveButton}
          >
            Cadastrar Paciente
          </Button>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePicker
          date={birthDate || new Date()}
          onSelect={(date) => {
            setBirthDate(date);
            setShowDatePicker(false);
            HapticFeedback.selection();
          }}
          onCancel={() => {
            setShowDatePicker(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  showPicker = false,
  onPress,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoFocus = false,
  style,
  colors,
}: any) {
  return (
    <View style={[styles.fieldContainer, style]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {showPicker || onPress ? (
        <Pressable onPress={onPress}>
          <View
            style={[
              styles.input,
              { borderColor: error ? colors.error : colors.border },
            ]}
          >
            <Text
              style={[styles.inputText, { color: value ? colors.text : colors.textSecondary }]}
              numberOfLines={1}
            >
              {value || placeholder}
            </Text>
            <Icon name="calendar" size={20} color={colors.textSecondary} />
          </View>
        </Pressable>
      ) : (
        <TextInput
          style={[
            styles.input,
            styles.inputText,
            { borderColor: error ? colors.error : colors.border },
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoFocus={autoFocus}
        />
      )}
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputText: {
    fontSize: 15,
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
