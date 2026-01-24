import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { PatientService } from '../../src/services/patientService';
import { Patient } from '../../src/types/schema';
import { PatientCard } from '../../src/components/PatientCard';

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await PatientService.getAll();
      setPatients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 pt-4 px-4">
      <Text className="text-2xl font-bold text-gray-800 mb-6">Meus Pacientes</Text>
      
      <FlatList
        data={patients}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PatientCard 
            patient={item} 
            onPress={(id) => console.log('Patient pressed:', id)} 
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Text className="text-gray-400">Nenhum paciente encontrado.</Text>
          </View>
        }
      />
    </View>
  );
}