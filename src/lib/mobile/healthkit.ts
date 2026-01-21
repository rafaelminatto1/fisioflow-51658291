/**
 * Serviço de Integração com Apple HealthKit
 * Permite ler e escrever dados de saúde do usuário
 */

import { Health } from '@capgo/capacitor-health';
import { Capacitor } from '@capacitor/core';

/**
 * Tipos de dados de saúde disponíveis
 */
export enum HealthDataType {
  STEPS = 'steps',
  DISTANCE = 'distance',
  ACTIVE_ENERGY_BURNED = 'active_energy_burned',
  HEART_RATE = 'heart_rate',
  RESTING_HEART_RATE = 'resting_heart_rate',
  STEPS_COUNT = 'steps_count',
  BLOOD_PRESSURE_SYSTOLIC = 'blood_pressure_systolic',
  BLOOD_PRESSURE_DIASTOLIC = 'blood_pressure_diastolic',
  BODY_TEMPERATURE = 'body_temperature',
  BLOOD_GLUCOSE = 'blood_glucose',
  SLEEP_ANALYSIS = 'sleep_analysis',
}

/**
 * Solicita permissão para acessar dados do HealthKit
 */
export async function requestHealthKitPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('HealthKit não disponível na web');
    return false;
  }

  try {
    const result = await Health.requestAuthorization({
      permissions: [
        { read: [HealthDataType.STEPS] },
        { read: [HealthDataType.DISTANCE] },
        { read: [HealthDataType.ACTIVE_ENERGY_BURNED] },
        { read: [HealthDataType.HEART_RATE] },
        { read: [HealthDataType.RESTING_HEART_RATE] },
        { read: [HealthDataType.SLEEP_ANALYSIS] },
        { read: [HealthDataType.BLOOD_PRESSURE_SYSTOLIC] },
        { read: [HealthDataType.BLOOD_PRESSURE_DIASTOLIC] },
        { read: [HealthDataType.BODY_TEMPERATURE] },
        { read: [HealthDataType.BLOOD_GLUCOSE] },
      ]
    });

    return result;
  } catch (error) {
    console.error('Erro ao solicitar permissão HealthKit:', error);
    return false;
  }
}

/**
 * Verifica se HealthKit está disponível
 */
export async function isHealthKitAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    await Health.isAvailable();
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém a quantidade de passos de hoje
 */
export async function getTodaySteps(): Promise<number> {
  if (!Capacitor.isNativePlatform()) {
    return 0;
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await Health.query({
      startDate: startOfDay,
      endDate: new Date(),
      dataTypes: [HealthDataType.STEPS]
    });

    if (result.data && result.data.length > 0) {
      return result.data[0].value || 0;
    }

    return 0;
  } catch (error) {
    console.error('Erro ao obter passos:', error);
    return 0;
  }
}

/**
 * Obtém a distância percorrida hoje (em metros)
 */
export async function getTodayDistance(): Promise<number> {
  if (!Capacitor.isNativePlatform()) {
    return 0;
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await Health.query({
      startDate: startOfDay,
      endDate: new Date(),
      dataTypes: [HealthDataType.DISTANCE]
    });

    if (result.data && result.data.length > 0) {
      return result.data[0].value || 0;
    }

    return 0;
  } catch (error) {
    console.error('Erro ao obter distância:', error);
    return 0;
  }
}

/**
 * Obtém calorias ativas queimadas hoje
 */
export async function getTodayActiveCalories(): Promise<number> {
  if (!Capacitor.isNativePlatform()) {
    return 0;
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await Health.query({
      startDate: startOfDay,
      endDate: new Date(),
      dataTypes: [HealthDataType.ACTIVE_ENERGY_BURNED]
    });

    if (result.data && result.data.length > 0) {
      return result.data[0].value || 0;
    }

    return 0;
  } catch (error) {
    console.error('Erro ao obter calorias:', error);
    return 0;
  }
}

/**
 * Obtém a frequência cardíaca mais recente
 */
export async function getLatestHeartRate(): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const result = await Health.query({
      startDate: new Date(Date.now() - 60 * 60 * 1000), // Última hora
      endDate: new Date(),
      dataTypes: [HealthDataType.HEART_RATE],
      limit: 1
    });

    if (result.data && result.data.length > 0) {
      return result.data[0].value || null;
    }

    return null;
  } catch (error) {
    console.error('Erro ao obter frequência cardíaca:', error);
    return null;
  }
}

/**
 * Obtém dados de saúde para um período específico
 */
export async function getHealthData(
  dataType: HealthDataType,
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<Array<{ date: Date; value: number }>> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  try {
    const result = await Health.query({
      startDate,
      endDate,
      dataTypes: [dataType],
      limit
    });

    return result.data?.map(item => ({
      date: new Date(item.startDate),
      value: item.value
    })) || [];
  } catch (error) {
    console.error('Erro ao obter dados de saúde:', error);
    return [];
  }
}

/**
 * Escreve dados de atividade no HealthKit
 * Útil para registrar exercícios completados
 */
export async function writeExerciseData(
  activityType: string,
  startDate: Date,
  endDate: Date,
  calories: number,
  distance?: number
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    // Registrar como atividade física
    await Health.write({
      data: [
        {
          dataType: 'active_energy_burned',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          value: calories,
          unit: 'kcal'
        },
        ...(distance ? [{
          dataType: 'distance',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          value: distance,
          unit: 'm'
        }] : [])
      ]
    });

    return true;
  } catch (error) {
    console.error('Erro ao escrever dados de exercício:', error);
    return false;
  }
}

/**
 * Obtém resumo de saúde de hoje
 */
export async function getTodayHealthSummary() Promise<{
  steps: number;
  distance: number;
  calories: number;
  heartRate?: number;
}> {
  const [steps, distance, calories, heartRate] = await Promise.all([
    getTodaySteps(),
    getTodayDistance(),
    getTodayActiveCalories(),
    getLatestHeartRate()
  ]);

  return {
    steps,
    distance,
    calories,
    heartRate: heartRate || undefined
  };
}

/**
 * Hook customizado para usar HealthKit em componentes React
 */
export function useHealthKit() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    const available = await isHealthKitAvailable();
    setIsAvailable(available);
  };

  const requestPermission = async () => {
    const granted = await requestHealthKitPermission();
    setHasPermission(granted);
    return granted;
  };

  return {
    isAvailable,
    hasPermission,
    requestPermission,
    getTodaySteps,
    getTodayDistance,
    getTodayActiveCalories,
    getLatestHeartRate,
    getTodayHealthSummary,
    writeExerciseData
  };
}

import { useState, useEffect } from 'react';
