import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';
import { router } from 'expo-router';

interface DataCategory {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.prototype.props.name;
  description: string;
  purpose: string;
  retention: string;
  thirdParties: string[];
  examples: string[];
}

const DATA_CATEGORIES: DataCategory[] = [
  {
    id: 'personal',
    name: 'Dados Pessoais',
    icon: 'person-outline',
    description: 'Informações básicas sobre você e seus pacientes.',
    examples: ['Nome', 'Email', 'CPF', 'Telefone', 'Data de Nascimento'],
    purpose: 'Identificação do usuário, comunicação e gestão de prontuários.',
    retention: 'Enquanto a conta estiver ativa ou conforme exigido por lei.',
    thirdParties: ['Firebase (Google Cloud)'],
  },
  {
    id: 'health',
    name: 'Dados de Saúde (PHI)',
    icon: 'medical-outline',
    description: 'Informações clínicas sensíveis dos seus pacientes.',
    examples: ['Evoluções SOAP', 'Fotos de Progresso', 'Histórico Médico', 'Prescrições'],
    purpose: 'Prestação de serviços de fisioterapia e acompanhamento clínico.',
    retention: 'Mínimo de 20 anos (conforme regulamentação do COFFITO).',
    thirdParties: ['Firebase (Armazenamento Criptografado)'],
  },
  {
    id: 'usage',
    name: 'Dados de Uso',
    icon: 'analytics-outline',
    description: 'Como você interage com as funcionalidades do aplicativo.',
    examples: ['Interações com recursos', 'Tempo de uso', 'Frequência de acesso'],
    purpose: 'Melhoria contínua da experiência do usuário e otimização de recursos.',
    retention: 'Até 2 anos.',
    thirdParties: ['Firebase Analytics'],
  },
  {
    id: 'technical',
    name: 'Dados Técnicos',
    icon: 'hardware-chip-outline',
    description: 'Informações sobre o dispositivo e erros do sistema.',
    examples: ['Modelo do aparelho', 'Versão do SO', 'Logs de erro (Crashlytics)'],
    purpose: 'Segurança, suporte técnico e correção de bugs.',
    retention: '90 dias para logs detalhados.',
    thirdParties: ['Firebase Crashlytics', 'Expo'],
  },
];

export default function DataTransparencyScreen() {
  const colors = useColors();

  const handleOpenPrivacyPolicy = () => {
    // In a real app, this would open a URL or navigate to the privacy policy screen
    // For now, let's try to navigate to the legal group if it exists
    router.push('/(legal)/privacy-policy' as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Transparência de Dados</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Entenda como o FisioFlow trata suas informações e as de seus pacientes.
          </Text>
        </View>

        {DATA_CATEGORIES.map((category) => (
          <Card key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name={category.icon as any} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {category.description}
            </Text>

            <View style={styles.detailSection}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Exemplos:</Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                {category.examples.join(', ')}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Finalidade:</Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                {category.purpose}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Retenção:</Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                {category.retention}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailLabel, { color: colors.text }]}>Compartilhamento:</Text>
              <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                {category.thirdParties.join(', ')}
              </Text>
            </View>
          </Card>
        ))}

        <Card style={styles.footerCard}>
          <Text style={[styles.footerTitle, { color: colors.text }]}>Mais informações</Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Para detalhes completos sobre nossos métodos de proteção, direitos do titular (LGPD) e 
            políticas de segurança, consulte nossa Política de Privacidade.
          </Text>
          <TouchableOpacity 
            style={[styles.linkButton, { backgroundColor: colors.primary }]}
            onPress={handleOpenPrivacyPolicy}
          >
            <Text style={styles.linkButtonText}>Ver Política de Privacidade</Text>
          </TouchableOpacity>
        </Card>
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
  categoryCard: {
    marginBottom: 16,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  footerCard: {
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  linkButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
