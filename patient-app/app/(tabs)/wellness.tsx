import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { Card } from '@/components';

// Importação dinâmica para não quebrar no Expo Go sem prebuild
const HealthConnect: any = null;
try {
  // HealthConnect = require('react-native-health-connect');
} catch (e) {
  console.log('Health Connect not available (Expo Go?)');
}

export default function WellnessScreen() {
  const colors = useColors();
  const [steps, setSteps] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const initializeHealthConnect = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Indisponível', 'Health Connect é apenas para Android. Use HealthKit no iOS.');
      return;
    }

    if (!HealthConnect) {
      Alert.alert('Aviso', 'Biblioteca Health Connect não instalada. Execute prebuild.');
      // Mock data for demo
      setSteps(5432); 
      setPermissionsGranted(true);
      return;
    }

    try {
      const isInitialized = await HealthConnect.initialize();
      if (!isInitialized) return;

      const granted = await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
      ]);

      if (granted) {
        setPermissionsGranted(true);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchData = async () => {
    if (!HealthConnect) return;
    
    const today = new Date();
    const result = await HealthConnect.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'after',
        startTime: new Date(today.setHours(0,0,0,0)).toISOString(),
      },
    });
    
    const totalSteps = result.reduce((sum: number, record: any) => sum + record.count, 0);
    setSteps(totalSteps);
  };

  useEffect(() => {
    initializeHealthConnect();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Bem-Estar</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Dados sincronizados do Google Health Connect
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Steps Card */}
        <Card style={styles.metricCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="footsteps" size={24} color="#F97316" />
          </View>
          <View style={styles.metricInfo}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Passos Hoje</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{steps.toLocaleString()}</Text>
          </View>
        </Card>

        {/* Placeholder for Heart Rate */}
        <Card style={styles.metricCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="heart" size={24} color="#EF4444" />
          </View>
          <View style={styles.metricInfo}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Batimentos</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>-- bpm</Text>
          </View>
        </Card>

        {!permissionsGranted && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={initializeHealthConnect}
          >
            <Text style={styles.buttonText}>Conectar Google Fit</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Para ver seus dados reais, instale o app Google Fit ou Health Connect no seu Android.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  infoBox: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  }
});
