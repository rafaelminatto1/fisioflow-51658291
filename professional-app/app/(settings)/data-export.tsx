import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, Button } from '@/components';
import { dataExportService } from '@/lib/services/dataExportService';
import { ExportFormat, ExportOptions } from '@/types/dataExport';

export default function DataExportScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [options, setOptions] = useState<ExportOptions>({
    includePatients: true,
    includeSOAPNotes: true,
    includePhotos: true,
    includeProtocols: true,
    includeExercises: true,
    includeAppointments: true,
    includeAuditLog: true,
    includeConsents: true,
  });

  const handleToggleOption = (key: keyof ExportOptions) => {
    setOptions({
      ...options,
      [key]: !options[key],
    });
  };

  const handleRequestExport = async () => {
    if (!user?.id) return;
    
    if (!password || password.length < 8) {
      Alert.alert('Erro', 'Por favor, defina uma senha de no mínimo 8 caracteres para criptografar seu arquivo de exportação.');
      return;
    }

    const anyOptionSelected = Object.values(options).some(val => val === true);
    if (!anyOptionSelected) {
      Alert.alert('Erro', 'Selecione pelo menos uma categoria de dados para exportar.');
      return;
    }

    setIsProcessing(true);
    try {
      await dataExportService.requestExport(user.id, format, options);
      Alert.alert(
        'Solicitação Enviada',
        'Seu pedido de exportação está sendo processado. Devido ao volume de dados e criptografia, isso pode levar até 48 horas. Você receberá uma notificação quando estiver pronto.',
        [{ text: 'Entendido' }]
      );
    } catch (error) {
      console.error('Error requesting export:', error);
      Alert.alert('Erro', 'Não foi possível processar sua solicitação de exportação. Tente novamente.');
    } finally {
      setIsProcessing(true); // Keep disabled or navigate back
      setIsProcessing(false);
    }
  };

  const renderOption = (label: string, key: keyof ExportOptions) => (
    <View style={styles.optionRow}>
      <Text style={[styles.optionLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={options[key]}
        onValueChange={() => handleToggleOption(key)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Exportar Meus Dados</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Solicite uma cópia completa de todas as suas informações e registros clínicos.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>FORMATO DO ARQUIVO</Text>
        <View style={styles.formatContainer}>
          <TouchableOpacity
            style={[
              styles.formatButton,
              format === 'json' && { backgroundColor: colors.primary, borderColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFormat('json')}
          >
            <Ionicons name="code-working" size={24} color={format === 'json' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.formatText, { color: format === 'json' ? '#FFFFFF' : colors.text }]}>JSON</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.formatButton,
              format === 'pdf' && { backgroundColor: colors.primary, borderColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFormat('pdf')}
          >
            <Ionicons name="document-text" size={24} color={format === 'pdf' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.formatText, { color: format === 'pdf' ? '#FFFFFF' : colors.text }]}>PDF</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>DADOS PARA INCLUIR</Text>
        <Card style={styles.optionsCard}>
          {renderOption('Prontuários de Pacientes', 'includePatients')}
          {renderOption('Evoluções SOAP', 'includeSOAPNotes')}
          {renderOption('Fotos e Anexos', 'includePhotos')}
          {renderOption('Protocolos de Tratamento', 'includeProtocols')}
          {renderOption('Exercícios e Prescrições', 'includeExercises')}
          {renderOption('Agenda e Consultas', 'includeAppointments')}
          {renderOption('Log de Auditoria', 'includeAuditLog')}
          {renderOption('Registros de Consentimento', 'includeConsents')}
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>SEGURANÇA DO ARQUIVO</Text>
        <Card style={styles.passwordCard}>
          <Text style={[styles.passwordInfo, { color: colors.textSecondary }]}>
            Seu arquivo será criptografado. Defina uma senha para abri-lo após o download.
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Senha para o arquivo"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </Card>

        <View style={styles.warningContainer}>
          <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.textSecondary }]}>
            O processamento pode levar até 48 horas. Você receberá um link de download válido por 7 dias.
          </Text>
        </View>

        <Button
          title="Solicitar Exportação"
          onPress={handleRequestExport}
          loading={isProcessing}
          style={styles.requestButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 1,
  },
  formatContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  formatButton: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  formatText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionsCard: {
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionLabel: {
    fontSize: 16,
  },
  passwordCard: {
    padding: 16,
  },
  passwordInfo: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  warningContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    paddingHorizontal: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  requestButton: {
    marginTop: 24,
    marginBottom: 32,
  },
});
