import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card } from "@/components";
import { Spacing } from "@/constants/spacing";
import { useColors } from "@/hooks/useColorScheme";
import { useExerciseStats } from "@/hooks/useExercises";
import { useReferral } from "@/hooks/useReferral";
import { APP_VERSION } from "@/lib/constants";
import { log } from "@/lib/logger";
import { usePatientNotifications } from "@/lib/notificationsSystem";
import { useAuthStore } from "@/store/auth";

const SCREEN_PADDING = Spacing.screen;
const CARD_GAP = Spacing.gap;
const HALF_CARD_WIDTH = (Dimensions.get("window").width - SCREEN_PADDING * 2 - CARD_GAP) / 2;

export default function ProfileScreen() {
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  const { data: stats, isLoading: loadingStats } = useExerciseStats();
  const { data: referral, isLoading: loadingReferral } = useReferral();
  const { requestPermission } = usePatientNotifications();

  const checkNotificationStatus = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationsEnabled(status === "granted");
    } catch (error) {
      log.error("Error checking notification status:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  useEffect(() => {
    checkNotificationStatus();
  }, [checkNotificationStatus]);

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await signOut();
            router.replace("/(auth)/login");
          } catch {
            Alert.alert("Erro", "Não foi possível sair. Tente novamente.");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleShareReferral = async () => {
    if (!referral?.code) return;
    const message = `Use meu código *${referral.code}* e ganhe ${referral.reward_value}% de desconto na sua primeira avaliação na Mooca Fisio! 🎁\n\nLink: https://app.moocafisio.com.br/indicacao/${referral.code}`;
    
    try {
      await Share.share({
        message,
        title: "Indicar Amigo",
      });
    } catch (error) {
      log.error("Share failed", error);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestPermission();
      if (granted) {
        setNotificationsEnabled(true);
        Alert.alert("Notificações Ativadas", "Você receberá lembretes de exercícios e consultas.");
      } else {
        Alert.alert(
          "Permissão Necessária",
          "Para receber notificações, você precisa permitir o acesso nas configurações do dispositivo.",
        );
      }
    } else {
      setNotificationsEnabled(false);
      Alert.alert("Notificações Desativadas", "Você não receberá mais lembretes.");
    }
  };

  const menuItems = [
    {
      icon: "settings-outline" as const,
      label: "Configurações Completas",
      onPress: () => router.push("/(tabs)/settings"),
      color: colors.primary,
    },
    {
      icon: "person-outline" as const,
      label: "Dados Pessoais",
      onPress: () => router.push("/profile/edit"),
      color: colors.text,
    },
    {
      icon: "lock-closed-outline" as const,
      label: "Alterar Senha",
      onPress: () => {
        router.replace("/(auth)/forgot-password");
      },
      color: colors.text,
    },
    {
      icon: "help-circle-outline" as const,
      label: "Ajuda e Suporte",
      onPress: () => router.push("/(tabs)/settings"),
      color: colors.text,
    },
    {
      icon: "document-text-outline" as const,
      label: "Termos de Uso",
      onPress: () => router.push("/(tabs)/settings"),
      color: colors.text,
    },
    {
      icon: "shield-outline" as const,
      label: "Política de Privacidade",
      onPress: () => router.push("/(tabs)/settings"),
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "P"}</Text>
            )}
          </View>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {user?.name || "Paciente"}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.email || "email@exemplo.com"}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats?.totalAppointments || 0}
              </Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Consultas</Text>
          </Card>
          <Card style={styles.statCard}>
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.success} />
            ) : (
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats?.totalExercises || 0}
              </Text>
            )}
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercícios</Text>
          </Card>
        </View>

        {/* Referral Program Card */}
        <Card style={[styles.referralCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <View style={styles.referralHeader}>
            <View style={[styles.referralIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="gift" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.referralTextContainer}>
              <Text style={[styles.referralTitle, { color: colors.text }]}>Indique um Amigo</Text>
              <Text style={[styles.referralSubtitle, { color: colors.textSecondary }]}>Ganhe benefícios na renovação</Text>
            </View>
          </View>

          <View style={[styles.codeContainer, { backgroundColor: colors.background }]}>
            {loadingReferral ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.referralCode, { color: colors.primary }]}>{referral?.code}</Text>
            )}
          </View>

          <Button
            title="Compartilhar Convite"
            onPress={handleShareReferral}
            variant="default"
            size="small"
            style={styles.shareButton}
          />
        </Card>

        {/* Notification Settings Card */}
        <Card style={styles.settingsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Configurações</Text>

          <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingItemLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Notificações Push</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Lembretes de exercícios e consultas
                </Text>
              </View>
            </View>
            {loadingNotifications ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{
                  false: colors.border,
                  true: colors.primary + "80",
                }}
                thumbColor={notificationsEnabled ? colors.primary : colors.textMuted}
                accessibilityLabel="Ativar ou desativar notificações push"
                accessibilityRole="switch"
                accessibilityState={{ checked: notificationsEnabled }}
              />
            )}
          </View>
        </Card>

        {/* Menu */}
        <Card style={styles.menuCard} padding="none">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuItem,
                index < menuItems.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={item.onPress}
              accessibilityLabel={item.label}
              accessibilityRole="button"
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={(item as any).color || colors.textSecondary}
                />
                <Text style={[styles.menuItemLabel, { color: colors.text }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout Button */}
        <Button
          title="Sair da Conta"
          onPress={handleLogout}
          variant="outline"
          loading={isLoggingOut}
          style={[styles.logoutButton, { borderColor: colors.error }]}
          textStyle={{ color: colors.error }}
        />

        {/* Version */}
        <Text style={[styles.version, { color: colors.textMuted }]}>FisioFlow v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screen,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 28,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.gap,
    marginBottom: 20,
  },
  statCard: {
    width: HALF_CARD_WIDTH,
    alignItems: "center",
    padding: Spacing.card,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
  },
  referralCard: {
    padding: Spacing.card,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 24,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  referralIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  referralTextContainer: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  referralSubtitle: {
    fontSize: 12,
  },
  codeContainer: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 16,
  },
  referralCode: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
  },
  shareButton: {
    borderRadius: 12,
  },
  settingsCard: {
    marginBottom: 20,
    padding: Spacing.card,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  menuCard: {
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.card,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
  },
  logoutButton: {
    marginBottom: 16,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 24,
  },
});
