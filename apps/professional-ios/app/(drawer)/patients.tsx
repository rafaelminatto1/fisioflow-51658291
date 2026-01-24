import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PatientsScreen() {
  const router = useRouter();

  const patients = [
    { id: '1', name: 'João Silva', nextSession: '15/01 - 14:00', status: 'Ativo' },
    { id: '2', name: 'Maria Santos', nextSession: '16/01 - 10:00', status: 'Ativo' },
    { id: '3', name: 'Pedro Costa', nextSession: '17/01 - 15:30', status: 'Ativo' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pacientes</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {patients.map((patient) => (
        <TouchableOpacity
          key={patient.id}
          style={styles.card}
          onPress={() => router.push(`/patients/${patient.id}` as any)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.patientName}>{patient.name}</Text>
            <View style={[styles.status, styles.statusActive]}>
              <Text style={styles.statusText}>{patient.status}</Text>
            </View>
          </View>
          <Text style={styles.nextSession}>Próxima sessão: {patient.nextSession}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  status: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  nextSession: {
    fontSize: 14,
    color: '#64748B',
  },
});
