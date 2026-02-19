import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColorScheme';
import { useAllFinancialRecords } from '@/hooks/usePatientFinancial';
import { Card } from '@/components';
import { format, subDays } from 'date-fns';

export default function FinancialsScreen() {
  const colors = useColors();
  const [dateRange, setDateRange] = useState<{ startDate: Date, endDate: Date }>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });

  const { data: records, isLoading, error } = useAllFinancialRecords({
      startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
      endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
  });

  const totalRevenue = records?.reduce((acc, record) => acc + (record.payment_status === 'paid' ? record.final_value : 0), 0) || 0;
  const totalPending = records?.reduce((acc, record) => acc + (record.payment_status === 'pending' ? record.final_value : 0), 0) || 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Financeiro Geral</Text>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.summaryContainer}>
            <Card style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Receita (Período)</Text>
                <Text style={[styles.summaryValue, {color: colors.success}]}>R$ {totalRevenue.toFixed(2)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Pendente (Período)</Text>
                <Text style={[styles.summaryValue, {color: colors.warning}]}>R$ {totalPending.toFixed(2)}</Text>
            </Card>
        </View>

        <Text style={[styles.listHeader, { color: colors.text }]}>Transações Recentes</Text>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }}/>
        ) : error ? (
          <Text style={{ textAlign: 'center', color: colors.error, marginTop: 40 }}>Erro ao carregar dados.</Text>
        ) : records && records.length > 0 ? (
          records.map(record => (
            <Card key={record.id} style={styles.recordCard}>
                <View>
                    <Text style={[styles.patientName, { color: colors.text }]}>{record.patient_name}</Text>
                    <Text style={[styles.recordDate, { color: colors.textSecondary }]}>{format(new Date(record.session_date), 'dd/MM/yyyy')}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={[styles.recordValue, { color: record.payment_status === 'paid' ? colors.success : colors.textSecondary }]}>
                        R$ {record.final_value.toFixed(2)}
                    </Text>
                    <Text style={[styles.recordStatus, { color: record.payment_status === 'paid' ? colors.success : colors.warning }]}>
                        {record.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </Text>
                </View>
            </Card>
          ))
        ) : (
          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 40 }}>Nenhum registro encontrado no período.</Text>
        )}
      </ScrollView>
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
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  listHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '500',
  },
  recordDate: {
    fontSize: 13,
    marginTop: 4,
  },
  recordValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordStatus: {
    fontSize: 13,
    marginTop: 4,
  }
});
