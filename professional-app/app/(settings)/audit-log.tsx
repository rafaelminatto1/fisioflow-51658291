import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { auditLogger } from '@/lib/services/auditLogger';
import { AuditLogEntry } from '@/types/audit';
import { Card } from '@/components';

export default function AuditLogScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await auditLogger.query({ userId: user.id, limit: 100 });
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadLogs();
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: 'Login',
      logout: 'Logout',
      view: 'Visualização',
      create: 'Criação',
      update: 'Atualização',
      delete: 'Exclusão',
      export: 'Exportação',
      'consent-granted': 'Consentimento concedido',
      'consent-withdrawn': 'Consentimento retirado',
      'settings-changed': 'Configurações alteradas'
    };
    return labels[action] || action;
  };

  const getResourceLabel = (resource: string) => {
    const labels: Record<string, string> = {
      patient: 'Paciente',
      soap_note: 'Evolução SOAP',
      photo: 'Foto',
      protocol: 'Protocolo',
      exercise: 'Exercício',
      appointment: 'Consulta',
      settings: 'Configurações',
      consent: 'Consentimento'
    };
    return labels[resource] || resource;
  };

  const getActionIcon = (action: string): keyof typeof Ionicons.prototype.props.name => {
    switch (action) {
      case 'login': return 'log-in-outline';
      case 'logout': return 'log-out-outline';
      case 'view': return 'eye-outline';
      case 'create': return 'add-circle-outline';
      case 'update': return 'create-outline';
      case 'delete': return 'trash-outline';
      case 'export': return 'download-outline';
      default: return 'document-text-outline';
    }
  };

  const renderItem = ({ item }: { item: AuditLogEntry }) => (
    <Card style={styles.logCard}>
      <View style={styles.logHeader}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name={getActionIcon(item.action) as any} size={20} color={colors.primary} />
        </View>
        <View style={styles.logTitleContainer}>
          <Text style={[styles.logAction, { color: colors.text }]}>{getActionLabel(item.action)}</Text>
          <Text style={[styles.logResource, { color: colors.textSecondary }]}>
            {getResourceLabel(item.resourceType)} {item.resourceId ? `(#${item.resourceId.substring(0, 8)})` : ''}
          </Text>
        </View>
      </View>
      
      <View style={styles.logFooter}>
        <View style={styles.logInfoRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.logInfoText, { color: colors.textMuted }]}>
            {new Date(item.timestamp).toLocaleString('pt-BR')}
          </Text>
        </View>
        <View style={styles.logInfoRow}>
          <Ionicons name="phone-portrait-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.logInfoText, { color: colors.textMuted }]}>
            {item.deviceInfo?.model} (v{item.deviceInfo?.appVersion})
          </Text>
        </View>
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Log de Auditoria</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Registro imutável de todos os acessos e modificações de dados de saúde.
        </Text>
      </View>

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-checkmark-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhum registro de auditoria encontrado.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
  },
  logCard: {
    marginBottom: 12,
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTitleContainer: {
    flex: 1,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  logResource: {
    fontSize: 13,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 8,
  },
  logInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logInfoText: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});
