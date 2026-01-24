import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  percentage: number;
  label: string;
}

export function ProgressCircle({ percentage, label }: Props) {
  return (
    <View className="items-center justify-center">
      <View className="w-32 h-32 rounded-full border-8 border-gray-100 items-center justify-center relative">
        <View 
          className="absolute inset-0 rounded-full border-8 border-primary" 
          style={{ 
            borderLeftColor: 'transparent', 
            borderBottomColor: 'transparent',
            transform: [{ rotate: `${(percentage * 3.6) - 45}deg` }] 
          }} 
        />
        <Text className="text-3xl font-bold text-gray-800">{percentage}%</Text>
      </View>
      <Text className="text-gray-500 mt-4 font-medium">{label}</Text>
    </View>
  );
}
