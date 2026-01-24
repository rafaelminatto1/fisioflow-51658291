import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { LogOut } from 'lucide-react-native';
import { auth } from '../../src/config/firebase';
import { signOut } from 'firebase/auth';

export default function Dashboard() {
  const { user } = useAuth();

  const handleSignOut = () => {
    if (auth) signOut(auth);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-primary p-8 pt-16 rounded-b-[40px]">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-lg opacity-80">Olá,</Text>
            <Text className="text-white text-2xl font-bold">{user?.displayName || 'Fisioterapeuta'}</Text>
          </View>
          <Pressable onPress={handleSignOut} className="bg-white/20 p-2 rounded-full">
            <LogOut size={24} color="white" />
          </Pressable>
        </View>
      </View>

      <View className="p-6">
        <Text className="text-xl font-bold text-gray-800 mb-4">Resumo de Hoje</Text>
        
        <View className="flex-row space-x-4 mb-6">
          <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Text className="text-gray-500 text-sm">Atendimentos</Text>
            <Text className="text-3xl font-bold text-primary">8</Text>
          </View>
          <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <Text className="text-gray-500 text-sm">Pacientes</Text>
            <Text className="text-3xl font-bold text-secondary">42</Text>
          </View>
        </View>

        <Text className="text-xl font-bold text-gray-800 mb-4">Próximos Horários</Text>
        <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center justify-center py-10">
          <Text className="text-gray-400 italic">Nenhum agendamento para agora.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
