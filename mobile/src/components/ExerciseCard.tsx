import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Exercise } from '../types/schema';
import { PlayCircle } from 'lucide-react-native';

interface Props {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: Props) {
  return (
    <Pressable className="bg-white p-4 rounded-2xl mb-3 shadow-sm border border-gray-100 flex-row items-center">
      <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mr-4">
        <PlayCircle size={24} color="#0EA5E9" />
      </View>
      
      <View className="flex-1">
        <Text className="text-lg font-bold text-gray-800">{exercise.name}</Text>
        <Text className="text-gray-500 text-sm">{exercise.muscle_group} • {exercise.category}</Text>
      </View>
    </Pressable>
  );
}
