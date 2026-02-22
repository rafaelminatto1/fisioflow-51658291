import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { consentManager } from '@/lib/services/consentManager';
import { CONSENT_TYPES } from '@/constants/consentTypes';
import { Consent } from '@/types/consent';
import { Card } from '@/components';

export default function ConsentManagementScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const userConsents = await consentManager.getUserConsents(user.id);
      setConsents(userConsents);
    } catch (error) {
      console.error('Error loading consents:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas preferências de consentimento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleConsent = async (consentType: string, currentStatus: string) => {
    if (!user?.id) return;

    if (currentStatus === 'granted') {
        // Withdraw
        Alert.alert(
            'Retirar Consentimento',
            `Deseja realmente retirar o consentimento para ${consentType}? Isso pode afetar algumas funcionalidades do aplicativo.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Retirar', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await consentManager.withdrawConsent(user.id, consentType);
                            await loadConsents();
                        } catch (error: any) {
                            Alert.alert('Erro', error.message || 'Não foi possível retirar o consentimento.');
                        }
                    }
                }
            ]
        );
    } else {
        // Grant
        try {
            await consentManager.grantConsent(user.id, consentType, '1.0');
            await loadConsents();
        } catch (error) {
            console.error('Error granting consent:', error);
            Alert.alert('Erro', 'Não foi possível conceder o consentimento.');
        }
    }
  };

  const renderConsentItem = (title: string, type: string, description: string, isRequired: boolean) => {
    const consent = consents.find(c => c.name === type);
    const isGranted = consent?.status === 'granted';

    return (
      <Card key={type} style={styles.consentCard}>
        <View style={styles.consentHeader}>
          <View style={styles.consentTitleContainer}>
            <Text style={[styles.consentTitle, { color: colors.text }]}>{title}</Text>
            {isRequired && (
              <View style={[styles.requiredBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.requiredText, { color: colors.primary }]}>Obrigatório</Text>
              </View>
            )}
          </View>
          {!isRequired && (
            <Switch
              value={isGranted}
              onValueChange={() => handleToggleConsent(type, isGranted ? 'granted' : 'withdrawn')}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
          {isRequired && (
             <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          )}
        </View>
        <Text style={[styles.consentDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
        {consent?.grantedAt && (
           <Text style={[styles.timestamp, { color: colors.textMuted }]}>
             Concedido em: {new Date(consent.grantedAt).toLocaleDateString('pt-BR')}
           </Text>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Gerenciar Consentimentos</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Controle como seus dados são utilizados e as permissões concedidas ao aplicativo.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>DADOS E PRIVACIDADE</Text>
        {renderConsentItem(
          'Política de Privacidade',
          CONSENT_TYPES.PRIVACY_POLICY,
          'Aceite dos termos de como tratamos seus dados e de seus pacientes.',
          true
        )}
        {renderConsentItem(
          'Termos de Serviço',
          CONSENT_TYPES.TERMS_OF_SERVICE,
          'Regras de utilização da plataforma e responsabilidades clínicas.',
          true
        )}

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>PERMISSÕES DO DISPOSITIVO</Text>
        {renderConsentItem(
          'Câmera',
          CONSENT_TYPES.CAMERA_PERMISSION,
          'Necessária para capturar fotos de progresso e demonstrar exercícios.',
          true
        )}
        {renderConsentItem(
          'Galeria de Fotos',
          CONSENT_TYPES.PHOTOS_PERMISSION,
          'Necessária para selecionar fotos e documentos existentes.',
          true
        )}
        {renderConsentItem(
          'Localização',
          CONSENT_TYPES.LOCATION_PERMISSION,
          'Utilizada para check-in automático e gestão de presença na clínica.',
          false
        )}

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>OPCIONAIS</Text>
        {renderConsentItem(
          'Análise de Uso',
          CONSENT_TYPES.ANALYTICS,
          'Nos ajuda a entender quais recursos são mais úteis para melhorar o app.',
          false
        )}
        {renderConsentItem(
          'Relatórios de Erros',
          CONSENT_TYPES.CRASH_REPORTS,
          'Envia dados técnicos anônimos quando o app apresenta falhas.',
          false
        )}
        {renderConsentItem(
          'Comunicações de Marketing',
          CONSENT_TYPES.MARKETING_EMAILS,
          'Receba novidades, dicas de fisioterapia e ofertas do FisioFlow.',
          false
        )}
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
    fontSize: 24,
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
  consentCard: {
    marginBottom: 12,
    padding: 16,
  },
  consentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  consentTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  consentTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  consentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  requiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
