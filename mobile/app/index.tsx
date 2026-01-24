import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#0EA5E9" />
    </View>
  );
}