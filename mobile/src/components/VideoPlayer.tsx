import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface Props {
  uri: string;
}

export function VideoPlayer({ uri }: Props) {
  return (
    <View className="w-full aspect-video bg-black rounded-2xl overflow-hidden">
      <Video
        source={{ uri }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping
      />
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    flex: 1,
  },
});
