import React from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';
import { useSyncStore } from '@/store/sync-store';

export function SyncConflictModal() {
  const colors = useColors();
  const { conflict, resolveConflict } = useSyncStore();

  if (!conflict) return null;

  return (
    <Modal visible={!!conflict} transparent animationType="slide">
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>Conflito de Sincronização</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            Encontramos versões diferentes para os mesmos dados. Qual você deseja manter?
          </Text>

          <ScrollView style={styles.scroll}>
            <View style={[styles.card, { borderColor: '#4CAF50', borderWidth: 2 }]}>
              <Text style={[styles.cardTitle, { color: '#4CAF50' }]}>Sua versão (Local)</Text>
              <Text style={[styles.cardData, { color: colors.text }]}>
                {JSON.stringify(conflict.localData, null, 2)}
              </Text>
            </View>

            <View style={[styles.card, { borderColor: '#F44336', borderWidth: 2 }]}>
              <Text style={[styles.cardTitle, { color: '#F44336' }]}>Versão do Servidor</Text>
              <Text style={[styles.cardData, { color: colors.text }]}>
                {JSON.stringify(conflict.serverData, null, 2)}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#4CAF50' }]}
              onPress={() => resolveConflict('local')}
            >
              <Text style={styles.buttonText}>Manter Local</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#F44336' }]}
              onPress={() => resolveConflict('server')}
            >
              <Text style={styles.buttonText}>Manter Servidor</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => resolveConflict('both')}
            >
              <Text style={styles.buttonText}>Manter Ambos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  scroll: {
    marginBottom: 20,
  },
  card: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  cardTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardData: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  actions: {
    gap: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
