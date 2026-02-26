import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/store/auth';
import { Card, Button } from '@/components';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NotificationCategory, NotificationPreference, NotificationPreferences } from '@/types/notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NotificationPreferencesScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // States for time picker
  const [showTimePicker, setShowTimePicker] = useState<{
    category: NotificationCategory;
    type: 'start' | 'end';
  } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const prefRef = doc(db, 'notification_preferences', user.id);
      const snapshot = await getDoc(prefRef);
      
      if (snapshot.exists()) {
        setPreferences(snapshot.data() as NotificationPreferences);
      } else {
        // Default preferences
        const defaultPrefs: NotificationPreferences = {
          userId: user.id,
          appointments: createDefaultPreference('appointments'),
          patients: createDefaultPreference('patients'),
          system: createDefaultPreference('system'),
          marketing: createDefaultPreference('marketing'),
          updatedAt: new Date(),
        };
        setPreferences(defaultPrefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      Alert.alert('Erro', 'Não foi possível carregar suas preferências de notificações.');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultPreference = (category: NotificationCategory): NotificationPreference => ({
    userId: user?.id || '',
    category,
    enabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    channels: { push: true, email: true, inApp: true }
  });

  const handleSave = async () => {
    if (!user?.id || !preferences) return;
    setIsSaving(true);
    try {
      const prefRef = doc(db, 'notification_preferences', user.id);
      await setDoc(prefRef, {
        ...preferences,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Sucesso', 'Suas preferências foram salvas.');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      Alert.alert('Erro', 'Não foi possível salvar suas preferências.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCategory = (category: NotificationCategory, updates: Partial<NotificationPreference>) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [category]: {
        ...preferences[category],
        ...updates
      }
    });
  };

  const renderCategory = (title: string, category: NotificationCategory, icon: keyof typeof Ionicons.prototype.props.name) => {
    if (!preferences) return null;
    const pref = preferences[category];

    return (
      <Card style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleContainer}>
            <Ionicons name={icon as any} size={22} color={colors.primary} />
            <Text style={[styles.categoryTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <Switch
            value={pref.enabled}
            onValueChange={(enabled) => updateCategory(category, { enabled })}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>

        {pref.enabled && (
          <View style={styles.quietHoursContainer}>
            <View style={styles.quietHoursHeader}>
              <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>
                Horário de Silêncio
              </Text>
              <Switch
                value={pref.quietHoursEnabled}
                onValueChange={(quietHoursEnabled) => updateCategory(category, { quietHoursEnabled })}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            
            {pref.quietHoursEnabled && (
              <View style={styles.timeRows}>
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => setShowTimePicker({ category, type: 'start' })}
                >
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Início:</Text>
                  <Text style={[styles.timeValue, { color: colors.primary }]}>{pref.quietHoursStart}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.timeButton, { backgroundColor: colors.primary + '10' }]}
                  onPress={() => setShowTimePicker({ category, type: 'end' })}
                >
                  <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Fim:</Text>
                  <Text style={[styles.timeValue, { color: colors.primary }]}>{pref.quietHoursEnd}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate && showTimePicker) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      updateCategory(showTimePicker.category, {
        [showTimePicker.type === 'start' ? 'quietHoursStart' : 'quietHoursEnd']: timeString
      });
    }
    setShowTimePicker(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Preferências de Notificações</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Personalize quais alertas você deseja receber e em quais horários.
          </Text>
        </View>

        {renderCategory('Agendamentos', 'appointments', 'calendar-outline')}
        {renderCategory('Pacientes', 'patients', 'people-outline')}
        {renderCategory('Sistema', 'system', 'settings-outline')}
        {renderCategory('Marketing', 'marketing', 'megaphone-outline')}

        <Button
          title="Salvar Alterações"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        />

        {showTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onTimeChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  categoryCard: {
    marginBottom: 16,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  quietHoursContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quietHoursLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeRows: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 13,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
