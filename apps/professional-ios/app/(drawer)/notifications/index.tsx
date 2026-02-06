/**
 * Notifications Screen
 * Displays all user notifications
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationCenter } from '@/components/NotificationCenter';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/components/ui/Header';
import { getNotificationManager } from '@/lib/notifications/notificationManager';
import { useAuth } from '@/hooks/useAuth';
import { HapticFeedback } from '@/lib/haptics';

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useAuth();

  useEffect(() => {
    // Initialize notifications for this user
    if (profile?.uid) {
      const manager = getNotificationManager();
      manager.initialize(profile.uid);

      // Clear badge when opening notifications
      manager.clearBadge();
    }
  }, [profile?.uid]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Notificações"
        showBackButton
        onBackPress={() => {
          HapticFeedback.light();
          router.back();
        }}
      />

      <View style={styles.content}>
        <NotificationCenter showHeader={false} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
