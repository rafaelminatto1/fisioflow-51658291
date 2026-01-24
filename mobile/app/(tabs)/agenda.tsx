import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { AppointmentService } from '../../src/services/appointmentService';
import { PatientService } from '../../src/services/patientService';
import { Appointment } from '../../src/types/schema';
import { AppointmentCard } from '../../src/components/AppointmentCard';

export default function AgendaScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientNames, setPatientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appts, patients] = await Promise.all([
        AppointmentService.getAll(),
        PatientService.getAll()
      ]);
      
      const names: Record<string, string> = {};
      patients.forEach(p => names[p.id] = p.name);
      
      setAppointments(appts);
      setPatientNames(names);
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
      <Text className="text-2xl font-bold text-gray-800 mb-6">Agenda</Text>
      
      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <AppointmentCard 
            appointment={item} 
            patientName={patientNames[item.patient_id] || 'Desconhecido'}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Text className="text-gray-400">Nenhum agendamento.</Text>
          </View>
        }
      />
    </View>
  );
}