import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';

const FAQS = [
  {
    question: 'Como meus dados são protegidos?',
    answer: 'O FisioFlow utiliza criptografia AES-256 para dados em repouso e TLS 1.3 para dados em trânsito. Suas evoluções SOAP possuem criptografia de ponta a ponta, garantindo que apenas você tenha acesso ao conteúdo clínico.'
  },
  {
    question: 'O app está em conformidade com a LGPD?',
    answer: 'Sim, o FisioFlow Professional foi desenvolvido seguindo todos os princípios da Lei Geral de Proteção de Dados (LGPD), incluindo o direito à portabilidade (exportação) e ao esquecimento (exclusão de conta).'
  },
  {
    question: 'Como exportar os prontuários dos meus pacientes?',
    answer: 'Acesse Configurações > Exportar Meus Dados. Você pode escolher o formato JSON ou PDF. O processamento é assíncrono e você receberá um aviso quando estiver pronto.'
  },
  {
    question: 'Por que preciso de autenticação biométrica?',
    answer: 'A biometria (Face ID ou Touch ID) adiciona uma camada extra de segurança necessária para o manuseio de dados sensíveis de saúde (PHI), impedindo acessos não autorizados mesmo se o celular estiver desbloqueado.'
  },
  {
    question: 'Como faço para excluir minha conta?',
    answer: 'Vá em Configurações > Excluir Minha Conta. Seguindo a LGPD, seus dados entrarão em um período de carência de 30 dias antes da remoção permanente.'
  }
];

export default function HelpScreen() {
  const colors = useColors();

  const handleContactSupport = () => {
    Linking.openURL('mailto:suporte@fisioflow.com.br');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Ajuda e Suporte</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Encontre respostas para as dúvidas mais comuns ou entre em contato.
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.primary }]}>PERGUNTAS FREQUENTES</Text>
        {FAQS.map((faq, index) => (
          <Card key={index} style={styles.faqCard}>
            <Text style={[styles.question, { color: colors.text }]}>{faq.question}</Text>
            <Text style={[styles.answer, { color: colors.textSecondary }]}>{faq.answer}</Text>
          </Card>
        ))}

        <View style={styles.contactSection}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>Ainda precisa de ajuda?</Text>
          <Text style={[styles.contactSubtitle, { color: colors.textSecondary }]}>
            Nossa equipe de suporte está à disposição para ajudar você.
          </Text>
          
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: colors.primary }]}
            onPress={handleContactSupport}
          >
            <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
            <Text style={styles.contactButtonText}>Enviar E-mail para o Suporte</Text>
          </TouchableOpacity>
          
          <Text style={[styles.availability, { color: colors.textMuted }]}>
            Resposta média em até 48 horas úteis.
          </Text>
        </View>
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
    marginBottom: 16,
    letterSpacing: 1,
  },
  faqCard: {
    marginBottom: 12,
    padding: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactSection: {
    marginTop: 32,
    marginBottom: 40,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  availability: {
    marginTop: 12,
    fontSize: 12,
  }
});
