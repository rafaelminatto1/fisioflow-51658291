import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useGenerateNFSe } from '@/hooks/useNFSe';
import { usePatients } from '@/hooks/usePatients';

export default function NFSeForm() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium, success, error: hapticError } = useHaptics();

  const generateMutation = useGenerateNFSe();
  const { data: patients = [], isLoading: isLoadingPatients } = usePatients({ status: 'active' });

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [valorServico, setValorServico] = useState('');
  const [discriminacao, setDiscriminacao] = useState('Serviços de Fisioterapia');
  const [tomadorNome, setTomadorNome] = useState('');
  const [tomadorCpf, setTomadorCpf] = useState('');
  const [showPatientPicker, setShowPatientPicker] = useState(false);

  const getDisplayValor = () => {
    if (!valorServico) return '';
    const val = parseFloat(valorServico) / 100;
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleValorChange = (text: string) => {
    setValorServico(text.replace(/\D/g, ''));
  };

  const validate = () => {
    if (!valorServico || parseFloat(valorServico) <= 0) {
      Alert.alert('Erro', 'Informe o valor do serviço.');
      return false;
    }
    if (!discriminacao.trim()) {
      Alert.alert('Erro', 'Informe a discriminação do serviço.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    light();
    if (!validate()) { hapticError(); return; }
    medium();

    try {
      const record = await generateMutation.mutateAsync({
        patient_id: patientId || undefined,
        valor_servico: parseFloat(valorServico) / 100,
        discriminacao: discriminacao.trim(),
        tomador_nome: tomadorNome.trim() || patientName || undefined,
        tomador_cpf_cnpj: tomadorCpf.replace(/\D/g, '') || undefined,
      });
      success();
      Alert.alert(
        'NFS-e gerada!',
        `RPS nº ${record.numero_rps}\nStatus: ${record.status}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      hapticError();
      Alert.alert('Erro', e.message ?? 'Não foi possível gerar a NFS-e.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Emitir NFS-e',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: colors.warningLight ?? '#FEF3C7', borderColor: '#F59E0B' }]}>
            <Ionicons name="information-circle" size={18} color="#92400E" />
            <Text style={[styles.infoText, { color: '#92400E' }]}>
              A NFS-e será gerada com as configurações da sua clínica cadastradas no painel web.
            </Text>
          </View>

          {/* Paciente */}
          <Text style={[styles.label, { color: colors.text }]}>Paciente (opcional)</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => { light(); setShowPatientPicker(true); }}
          >
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.pickerBtnText, { color: patientName ? colors.text : colors.textMuted }]}>
              {patientName || 'Selecionar paciente...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Valor */}
          <Text style={[styles.label, { color: colors.text }]}>Valor do serviço *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={getDisplayValor()}
            onChangeText={handleValorChange}
          />

          {/* Discriminação */}
          <Text style={[styles.label, { color: colors.text }]}>Discriminação do serviço *</Text>
          <TextInput
            style={[styles.inputMulti, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            multiline
            numberOfLines={2}
            value={discriminacao}
            onChangeText={setDiscriminacao}
            placeholder="Descreva o serviço prestado..."
            placeholderTextColor={colors.textMuted}
          />

          {/* Tomador */}
          <Text style={[styles.label, { color: colors.text }]}>Nome do tomador</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Nome do tomador (opcional)"
            placeholderTextColor={colors.textMuted}
            value={tomadorNome}
            onChangeText={setTomadorNome}
          />

          <Text style={[styles.label, { color: colors.text }]}>CPF/CNPJ do tomador</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="000.000.000-00 (opcional)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={tomadorCpf}
            onChangeText={setTomadorCpf}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="receipt-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Gerar NFS-e</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Patient Picker Modal */}
      <Modal visible={showPatientPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Paciente</Text>
            <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.patientItem, { borderBottomColor: colors.border }]}
            onPress={() => { setPatientId(''); setPatientName(''); setTomadorNome(''); setShowPatientPicker(false); }}
          >
            <Text style={[styles.patientItemText, { color: colors.textSecondary }]}>Sem paciente</Text>
          </TouchableOpacity>
          {isLoadingPatients ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <ScrollView>
              {patients.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setPatientId(p.id);
                    setPatientName(p.name);
                    if (!tomadorNome) setTomadorNome(p.name);
                    setShowPatientPicker(false);
                  }}
                >
                  <Text style={[styles.patientItemText, { color: colors.text }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: { flex: 1, fontSize: 15 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 28,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  patientItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  patientItemText: { fontSize: 15 },
});
