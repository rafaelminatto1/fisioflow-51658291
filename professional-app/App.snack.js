// App.js - Versão para Expo Snack
// O Snack não suporta expo-router, então precisamos usar navegação tradicional

import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, Button } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>FisioFlow Pro</Text>
        <Text style={styles.subtitle}>App Profissional</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Este é um projeto simplificado para o Expo Snack.
          </Text>
          <Text style={styles.infoText}>
            O projeto original usa expo-router, que não é suportado pelo Snack.
          </Text>
          <Text style={styles.infoText}>
            Para testar o app completo, use um emulador local ou dispositivo físico.
          </Text>
        </View>
        <Button
          title="Saiba mais sobre Expo Router"
          onPress={() => console.log('Ver documentação do expo-router')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    lineHeight: 20,
  },
});
