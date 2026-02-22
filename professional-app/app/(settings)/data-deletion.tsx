import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, Button } from '@/components';
import { dataDeletionService } from '@/lib/services/dataDeletionService';
import { DataDeletionRequest } from '@/types/dataDeletion';

export default function DataDeletionScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<DataDeletionRequest | null>(null);

  useEffect(() => {
    loadDeletionStatus();
  }, []);

  const loadDeletionStatus = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const status = await dataDeletionService.getDeletionStatus(user.id);
      setPendingRequest(status);
    } catch (error) {
      console.error('Error loading deletion status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user?.id) return;
    
    if (!password) {
      Alert.alert('Erro', 'Por favor, confirme sua senha para prosseguir com a exclusão da conta.');
      return;
    }

    Alert.alert(
      '⚠️ Confirmar Exclusão',
      'Esta ação irá agendar a exclusão permanente de todos os seus dados. Você terá 30 dias para cancelar este processo. Deseja continuar?',
      [
        { text: 'Não, cancelar', style: 'cancel' },
        { 
          text: 'Sim, agendar exclusão', 
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            try {
              // In a real app, verify password here before calling service
              const request = await dataDeletionService.requestDeletion(user.id, reason);
              setPendingRequest(request);
              Alert.alert(
                'Solicitação Registrada',
                'Sua conta foi programada para exclusão. Você receberá um e-mail de confirmação.',
                [{ text: 'Entendido' }]
              );
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível processar seu pedido.');
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelDeletion = async () => {
    if (!user?.id || !pendingRequest) return;

    setIsProcessing(true);
    try {
      await dataDeletionService.cancelDeletion(pendingRequest.id, user.id);
      setPendingRequest(null);
      Alert.alert('Sucesso', 'A exclusão da sua conta foi cancelada. Seus dados estão seguros.');
    } catch (error) {
      console.error('Error cancelling deletion:', error);
      Alert.alert('Erro', 'Não foi possível cancelar a exclusão. Tente novamente ou contate o suporte.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (pendingRequest) {
    const scheduledDate = pendingRequest.scheduledFor ? new Date(pendingRequest.scheduledFor).toLocaleDateString('pt-BR') : '';
    
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="time-outline" size={32} color={colors.warning} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Exclusão Agendada</Text>
            </View>
            <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
              Sua conta e todos os dados associados estão programados para serem removidos permanentemente em:
            </Text>
            <Text style={[styles.dateText, { color: colors.primary }]}>{scheduledDate}</Text>
            <Text style={[styles.gracePeriodInfo, { color: colors.textMuted }]}>
              Você pode cancelar esta solicitação a qualquer momento antes desta data para manter seu acesso.
            </Text>
            <Button
              title="Cancelar Exclusão de Conta"
              onPress={handleCancelDeletion}
              loading={isProcessing}
              variant="outline"
              style={styles.cancelButton}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Excluir Minha Conta</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sentimos muito que você queira nos deixar. Entenda o processo de remoção de dados.
          </Text>
        </View>

        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={[styles.warningTitle, { color: '#EF4444' }]}>Atenção: Ação Permanente</Text>
          </View>
          <Text style={[styles.warningDescription, { color: colors.textSecondary }]}>
            Ao confirmar esta solicitação:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Todos os seus dados de pacientes serão apagados.</Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Suas evoluções e prontuários serão destruídos.</Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Você perderá acesso imediato à plataforma FisioFlow Pro.</Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>• Dados financeiros e históricos de pagamentos serão mantidos por fins legais.</Text>
          </View>
          <Text style={[styles.recommendation, { color: colors.text }]}>
            Recomendamos que você realize uma <Text style={{fontWeight: 'bold'}}>exportação completa</Text> dos seus dados antes de prosseguir.
          </Text>
        </Card>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Confirme sua senha</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Digite sua senha atual"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={[styles.label, { color: colors.text }]}>Por que você está nos deixando? (Opcional)</Text>
          <TextInput
            style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
            placeholder="Conte-nos o motivo para podermos melhorar..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={reason}
            onChangeText={setReason}
          />

          <Button
            title="Solicitar Exclusão Permanentemente"
            onPress={handleRequestDeletion}
            loading={isProcessing}
            style={styles.deleteButton}
            textStyle={{ color: '#FFFFFF' }}
            variant="primary" // In a real theme this might be 'danger'
          />
        </View>

        <Text style={[styles.graceInfo, { color: colors.textMuted }]}>
          Após a solicitação, seus dados serão mantidos em um período de carência de 30 dias (conforme a LGPD) caso você mude de ideia. Após esse prazo, a exclusão é definitiva.
        </Text>
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
  warningCard: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    padding: 16,
    marginBottom: 24,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  warningDescription: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  bulletList: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 16,
    marginBottom: 32,
    textAlignVertical: 'top',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  graceInfo: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  statusCard: {
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  statusDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  gracePeriodInfo: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  cancelButton: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
