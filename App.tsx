/**
 * FisioFlow - Expo Mobile App Entry Point
 * Este é o ponto de entrada para o app React Native via Expo
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>FisioFlow</Text>
        <Text style={styles.subtitle}>
          App Mobile em Desenvolvimento
        </Text>
        <Text style={styles.description}>
          Este é o app FisioFlow rodando no Expo Go!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 20,
  },
  description: {
    fontSize: 14,
    color: '#e0f2fe',
    textAlign: 'center',
  },
});
