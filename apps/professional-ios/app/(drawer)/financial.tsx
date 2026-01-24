import { View, Text, StyleSheet } from 'react-native';

export default function FinancialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Financeiro</Text>
      <Text style={styles.placeholder}>Controle financeiro em desenvolvimento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  placeholder: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
});
