import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAllFinancialRecords } from '@/hooks/usePatientFinancial';
import { Card } from '@/components';
import { format, subDays } from 'date-fns';
import { useHaptics } from '@/hooks/useHaptics';

export default function FinancialsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium } = useHaptics();
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [dateRange, setDateRange] = useState<{ startDate: Date, endDate: Date }>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const queryOptions = useMemo(() => ({
    startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
    endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
  }), [dateRange.startDate, dateRange.endDate]);

  const { data: records, isLoading, error, refetch } = useAllFinancialRecords(queryOptions);

  const filteredRecords = useMemo(() => {
    if (!records) return [];
    if (filter === 'all') return records;
    return records.filter(r => r.payment_status === filter);
  }, [records, filter]);

  const totalRevenue = records?.reduce((acc, record) => acc + (record.payment_status === 'paid' ? record.final_value : 0), 0) || 0;
  const totalPending = records?.reduce((acc, record) => acc + (record.payment_status === 'pending' ? record.final_value : 0), 0) || 0;

  const handleRefresh = async () => {
    light();
    await refetch();
  };

  const handleAdd = () => {
    medium();
    router.push('/financial-form');
  };

  const handleEdit = (record: any) => {
    medium();
    router.push({
      pathname: '/financial-form',
      params: {
        id: record.id,
        patientId: record.patient_id,
        amount: Math.round(record.final_value * 100), // Convert to cents for input
        date: record.session_date,
        description: record.notes,
        paymentMethod: record.payment_method,
        status: record.payment_status,
      }
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with Add Button */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Financeiro</Text>
      </View>

      <ScrollView 
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
            <Card style={styles.summaryCard}>
                <View style={styles.iconContainer}>
                    <Ionicons name="arrow-up-circle" size={24} color={colors.success} />
                </View>
                <Text style={[styles.summaryValue, {color: colors.success}]}>
                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.summaryLabel}>Receita (30d)</Text>
            </Card>
            <Card style={styles.summaryCard}>
                <View style={styles.iconContainer}>
                    <Ionicons name="time" size={24} color={colors.warning} />
                </View>
                <Text style={[styles.summaryValue, {color: colors.warning}]}>
                    R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
                <Text style={styles.summaryLabel}>Pendente (30d)</Text>
            </Card>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
            {(['all', 'pending', 'paid'] as const).map((f) => (
                <TouchableOpacity
                    key={f}
                    style={[
                        styles.filterChip, 
                        { borderColor: colors.border, backgroundColor: filter === f ? colors.primary : 'transparent' }
                    ]}
                    onPress={() => { light(); setFilter(f); }}
                >
                    <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.text }]}>
                        {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Pagos'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>

        <Text style={[styles.listHeader, { color: colors.text }]}>Transações</Text>

        {isLoading && !records ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }}/>
        ) : error ? (
          <Text style={{ textAlign: 'center', color: colors.error, marginTop: 40 }}>Erro ao carregar dados.</Text>
        ) : filteredRecords.length > 0 ? (
          filteredRecords.map(record => (
            <TouchableOpacity key={record.id} onPress={() => handleEdit(record)} activeOpacity={0.7}>
                <Card style={styles.recordCard}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={[styles.patientName, { color: colors.text }]}>{record.patient_name}</Text>
                            <Text style={[styles.recordDate, { color: colors.textSecondary }]}>
                                {format(new Date(record.session_date), 'dd/MM/yyyy')} • {record.payment_method === 'credit_card' ? 'Cartão' : record.payment_method || 'Outro'}
                            </Text>
                        </View>
                        <View style={[
                            styles.statusBadge, 
                            { backgroundColor: record.payment_status === 'paid' ? colors.success + '20' : colors.warning + '20' }
                        ]}>
                            <Text style={[
                                styles.statusText, 
                                { color: record.payment_status === 'paid' ? colors.success : colors.warning }
                            ]}>
                                {record.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.cardFooter}>
                        <Text style={[styles.recordValue, { color: colors.text }]}>
                            R$ {record.final_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </View>
                </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 12 }}>
                  Nenhum registro encontrado.
              </Text>
          </View>
        )}
        <View style={{ height: 80 }} /> 
      </ScrollView>

      {/* FAB - Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary }]} 
        onPress={handleAdd}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recordCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0', // Light border for internal separation
  },
  recordValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});
