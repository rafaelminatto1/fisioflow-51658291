import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { PatientCard } from '@/components/patient/PatientCard'; // Using local component instead of shared package

// Mock data for proof of concept
const MOCK_PATIENTS = [
  {
    id: '1',
    name: 'Ana Silva',
    condition: 'Pós-op LCA',
    status: 'Em Tratamento',
    stats: { sessionsCompleted: 12, nextAppointment: '22/02' }
  },
  {
    id: '2',
    name: 'Carlos Oliveira',
    condition: 'Dor Lombar Crônica',
    status: 'Alta',
    stats: { sessionsCompleted: 24, nextAppointment: undefined }
  },
  {
    id: '3',
    name: 'Mariana Souza',
    condition: 'Tendinite Ombro',
    status: 'Inativo',
    stats: { sessionsCompleted: 5, nextAppointment: '25/02' }
  }
];

export default function PatientsScreenV2() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Pacientes (V2 Monorepo)' }} />
      
      <View style={styles.content}>
        <Text style={styles.subtitle}>Componentes locais (Mobile Adapter)</Text>
        
        <FlatList
          data={MOCK_PATIENTS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PatientCard
              name={item.name}
              condition={item.condition}
              status={item.status}
              stats={item.stats}
              onClick={() => router.push(`/patient/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 20,
  }
});
