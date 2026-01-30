import React from 'react';
import { View, Text } from 'react-native';
import { Appointment } from '../types/schema';

interface Props {
  appointment: Appointment;
  patientName?: string;
}

export function AppointmentCard({ appointment, patientName = 'Paciente' }: Props) {
  const date = new Date(appointment.date);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = date.toLocaleDateString([], { day: '2-digit', month: 'short' });

  return (
    <View className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row">
      <View className="items-center justify-center pr-4 border-r border-gray-100 mr-4">
        <Text className="text-2xl font-bold text-gray-800">{time}</Text>
        <Text className="text-sm text-gray-500 uppercase font-medium">{day}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800">{patientName}</Text>
        <Text className="text-primary font-medium text-base">{appointment.type}</Text>

        <View className="flex-row items-center mt-2">
          <View className={`px-2.5 py-1 rounded bg-gray-100`}>
            <Text className="text-sm text-gray-600 font-semibold">{appointment.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
