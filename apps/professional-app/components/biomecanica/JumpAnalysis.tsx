import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface JumpAnalysisProps {
  flightTimeMs: number;
}

export function JumpAnalysis({ flightTimeMs }: JumpAnalysisProps) {
  if (flightTimeMs <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Selecione os pontos de decolagem e aterrissagem</Text>
      </View>
    );
  }

  const t = flightTimeMs / 1000; // in seconds
  const g = 9.81; // gravity
  const heightMeters = (Math.pow(t, 2) * g) / 8;
  const heightCm = heightMeters * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Altura do Salto</Text>
      <Text style={styles.value} testID="jump-height-result">
        {heightCm.toFixed(1)} cm
      </Text>
      <Text style={styles.subvalue}>Tempo de voo: {flightTimeMs} ms</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
  },
  label: {
    color: '#a0a0a0',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  value: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  subvalue: {
    color: '#ffffff',
    fontSize: 12,
  }
});
