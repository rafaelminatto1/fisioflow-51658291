import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { ExerciseService } from '../../src/services/exerciseService';
import { Exercise } from '../../src/types/schema';
import { ExerciseCard } from '../../src/components/ExerciseCard';

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await ExerciseService.getAll();
      setExercises(data);
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
      <Text className="text-2xl font-bold text-gray-800 mb-6">Biblioteca</Text>
      
      <FlatList
        data={exercises}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        ListEmptyComponent={
          <View className="items-center py-10">
            <Text className="text-gray-400">Nenhum exercício encontrado.</Text>
          </View>
        }
      />
    </View>
  );
}