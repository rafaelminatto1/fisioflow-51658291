import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Patient } from '../types/schema';
import { User } from 'lucide-react-native';

interface Props {
  patient: Patient;
  onPress: (id: string) => void;
}

export function PatientCard({ patient, onPress }: Props) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em_Tratamento': return 'text-blue-600 bg-blue-100';
      case 'Recuperacao': return 'text-green-600 bg-green-100';
      case 'Inicial': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Pressable 
      className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row items-center"
      onPress={() => onPress(patient.id)}
    >
      <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mr-4">
        <User size={24} color="#6B7280" />
      </View>
      
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800">{patient.name}</Text>
        <Text className="text-gray-500 text-sm">{patient.main_condition || 'Sem diagnóstico principal'}</Text>
        
        <View className="flex-row mt-2">
          <View className={`px-2 py-1 rounded-md ${getStatusColor(patient.status).split(' ')[1]}`}>
            <Text className={`text-xs font-semibold ${getStatusColor(patient.status).split(' ')[0]}`}>
              {patient.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      <View className="h-full justify-center">
        <Text className="text-2xl font-bold text-gray-300">{patient.progress}%</Text>
      </View>
    </Pressable>
  );
}
