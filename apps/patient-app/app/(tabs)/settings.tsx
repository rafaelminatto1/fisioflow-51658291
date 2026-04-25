/**
 * Settings Screen - Patient App
 * Complete settings and configuration screen
 */

import { useState, useEffect, useCallback } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Card, Button } from "@/components";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { exportAndSharePatientData } from "@/lib/dataExport";
import { log } from "@/lib/logger";
import { ExerciseReminders, type ExerciseReminderConfig } from "@/lib/exerciseReminders";
import { requestNotificationPermissions } from "@/lib/notificationsSystem";

interface SettingSection {
  title: string;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  type: "toggle" | "navigation" | "action" | "info";
  value?: boolean;
  onPress?: () => void;
  description?: string;
  badge?: string;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function SettingsScreen() {
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const { isOnline, pendingOperations } = useOfflineSync();
  const [settings, setSettings] = useState({
    notifications: true,
    exerciseReminders: true,
    appointmentReminders: true,
    darkMode: null as boolean | null, // null = auto
    autoPlayVideos: true,
    hapticFeedback: true,
  });
  const [exporting, setExporting] = useState(false);

  // Exercise Reminders config
  const [remindersManager] = useState(() => new ExerciseReminders(user?.id));
  const [remindersConfig, setRemindersConfig] = useState<ExerciseReminderConfig>({
    enabled: false,
    frequency: "daily",
    times: ["09:00", "18:00"],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  });
  const [editingTime, setEditingTime] = useState<{ index: number; value: string } | null>(null);

  useEffect(() => {
    loadSettings();
    remindersManager.initialize().then(() => {
      setRemindersConfig(remindersManager.getConfig());
    });
  }, []);

  const handleToggleReminders = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const perm = await requestNotificationPermissions();
        if (!perm.granted) {
          Alert.alert(
            "Permissão Necessária",
            "Ative as notificações nas configurações do dispositivo para receber lembretes.",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Abrir Configurações", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }
      const updated = { ...remindersConfig, enabled };
      setRemindersConfig(updated);
      await remindersManager.updateConfig(updated);
    },
    [remindersConfig, remindersManager],
  );

  const handleToggleDay = useCallback(
    async (day: number) => {
      const days = remindersConfig.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6];
      const newDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
      const updated = { ...remindersConfig, daysOfWeek: newDays };
      setRemindersConfig(updated);
      await remindersManager.updateConfig(updated);
    },
    [remindersConfig, remindersManager],
  );

  const handleSaveTime = useCallback(async () => {
    if (!editingTime) return;
    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timePattern.test(editingTime.value)) {
      Alert.alert("Horário Inválido", "Use o formato HH:mm (ex: 09:00)");
      return;
    }
    const newTimes = [...remindersConfig.times];
    newTimes[editingTime.index] = editingTime.value;
    const updated = { ...remindersConfig, times: newTimes };
    setRemindersConfig(updated);
    await remindersManager.updateConfig(updated);
    setEditingTime(null);
  }, [editingTime, remindersConfig, remindersManager]);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("@fisioflow_settings");
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      log.error("Error loading settings:", error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem("@fisioflow_settings", JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      log.error("Error saving settings:", error);
    }
  };

  const updateSetting = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const clearCache = async () => {
    Alert.alert(
      "Limpar Cache",
      "Isso irá limpar todos os dados em cache. Você precisará estar conectado para baixar os dados novamente. Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await loadSettings();
              Alert.alert("Sucesso", "Cache limpo com sucesso!");
            } catch {
              Alert.alert("Erro", "Não foi possível limpar o cache.");
            }
          },
        },
      ],
    );
  };

  const handleExportData = async () => {
    if (!user?.id) return;

    Alert.alert(
      "Exportar Meus Dados",
      "Esta ação irá gerar um arquivo JSON com todos os seus dados (exercícios, consultas, evoluções) em conformidade com a LGPD. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Exportar",
          onPress: async () => {
            setExporting(true);
            try {
              await exportAndSharePatientData(user.id);
            } catch (error) {
              log.error("Export error:", error);
              Alert.alert(
                "Erro na Exportação",
                "Não foi possível exportar seus dados. Tente novamente.",
              );
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair da sua conta? Os dados offline serão removidos.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/(auth)/login");
          } catch {
            Alert.alert("Erro", "Não foi possível sair. Tente novamente.");
          }
        },
      },
    ]);
  };

  const openURL = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o link.");
    });
  };

  const sections: SettingSection[] = [
    {
      title: "Notificações",
      items: [
        {
          id: "notifications",
          icon: "notifications",
          label: "Notificações Push",
          type: "toggle",
          value: settings.notifications,
          onPress: () => updateSetting("notifications", !settings.notifications),
          description: "Receba alertas de exercícios e consultas",
        },
        {
          id: "exerciseReminders",
          icon: "fitness",
          label: "Lembretes de Exercícios",
          type: "toggle",
          value: settings.exerciseReminders,
          onPress: () => updateSetting("exerciseReminders", !settings.exerciseReminders),
          description: "Lembretes diários para completar exercícios",
        },
        {
          id: "appointmentReminders",
          icon: "calendar",
          label: "Lembretes de Consultas",
          type: "toggle",
          value: settings.appointmentReminders,
          onPress: () => updateSetting("appointmentReminders", !settings.appointmentReminders),
          description: "Alertas antes das consultas agendadas",
        },
      ],
    },
    {
      title: "Preferências",
      items: [
        {
          id: "autoPlayVideos",
          icon: "play-circle",
          label: "Reproduzir Vídeos Automaticamente",
          type: "toggle",
          value: settings.autoPlayVideos,
          onPress: () => updateSetting("autoPlayVideos", !settings.autoPlayVideos),
        },
        {
          id: "hapticFeedback",
          icon: "hand-left",
          label: "Feedback Háptico",
          type: "toggle",
          value: settings.hapticFeedback,
          onPress: () => updateSetting("hapticFeedback", !settings.hapticFeedback),
          description: "Vibração ao completar ações",
        },
      ],
    },
    {
      title: "Dados e Armazenamento",
      items: [
        {
          id: "syncStatus",
          icon: "sync",
          label: "Sincronização",
          type: "info",
          description: isOnline
            ? "Conectado e sincronizado"
            : "Offline - alterações serão salvas localmente",
          badge: pendingOperations > 0 ? `${pendingOperations} pendentes` : undefined,
        },
        {
          id: "clearCache",
          icon: "trash-outline",
          label: "Limpar Cache",
          type: "action",
          onPress: clearCache,
          description: "Libere espaço no dispositivo",
        },
        {
          id: "exportData",
          icon: "download-outline",
          label: "Exportar Meus Dados",
          type: "action",
          onPress: handleExportData,
          description: exporting ? "Exportando..." : "Baixar todos os seus dados (LGPD)",
        },
      ],
    },
    {
      title: "Suporte",
      items: [
        {
          id: "help",
          icon: "help-circle",
          label: "Central de Ajuda",
          type: "navigation",
          onPress: () => Alert.alert("Em breve", "Funcionalidade em desenvolvimento"),
        },
        {
          id: "contact",
          icon: "mail",
          label: "Contato",
          type: "action",
          onPress: () => openURL("mailto:suporte@moocafisio.com.br"),
          description: "suporte@moocafisio.com.br",
        },
        {
          id: "privacy",
          icon: "shield",
          label: "Política de Privacidade",
          type: "action",
          onPress: () => openURL("https://moocafisio.com.br/privacidade"),
        },
        {
          id: "terms",
          icon: "document-text",
          label: "Termos de Uso",
          type: "action",
          onPress: () => openURL("https://moocafisio.com.br/termos"),
        },
      ],
    },
    {
      title: "Sobre",
      items: [
        {
          id: "version",
          icon: "information-circle",
          label: "Versão",
          type: "info",
          description: "FisioFlow Paciente v1.0.0",
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Configurações</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Personalize sua experiência
          </Text>
        </View>

        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || "P"}</Text>
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: colors.text }]}>
                {user?.name || "Paciente"}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                {user?.email || "email@exemplo.com"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Exercise Reminders Config Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lembretes de Exercícios</Text>
          <Card style={styles.sectionCard} padding="none">
            {/* Enable toggle */}
            <View
              style={[
                styles.settingItem,
                { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="fitness" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Ativar Lembretes
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                    Receba notificações nos horários configurados
                  </Text>
                </View>
              </View>
              <Switch
                value={remindersConfig.enabled}
                onValueChange={handleToggleReminders}
                trackColor={{ false: colors.border, true: colors.primary + "80" }}
                thumbColor={remindersConfig.enabled ? colors.primary : colors.textMuted}
              />
            </View>

            {/* Time slots */}
            {remindersConfig.enabled && (
              <>
                <View
                  style={[
                    styles.settingItem,
                    {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      flexDirection: "column",
                      alignItems: "flex-start",
                    },
                  ]}
                >
                  <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 8 }]}>
                    Horários
                  </Text>
                  <View style={styles.timesRow}>
                    {remindersConfig.times.map((time, idx) =>
                      editingTime?.index === idx ? (
                        <View key={idx} style={styles.timeEditRow}>
                          <TextInput
                            style={[
                              styles.timeInput,
                              { color: colors.text, borderColor: colors.primary },
                            ]}
                            value={editingTime.value}
                            onChangeText={(v) => setEditingTime({ index: idx, value: v })}
                            placeholder="HH:mm"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            maxLength={5}
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={handleSaveTime}
                            style={[styles.timeEditBtn, { backgroundColor: colors.primary }]}
                          >
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setEditingTime(null)}
                            style={[styles.timeEditBtn, { backgroundColor: colors.border }]}
                          >
                            <Ionicons name="close" size={16} color={colors.text} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.timeBadge, { backgroundColor: colors.primary + "20" }]}
                          onPress={() => setEditingTime({ index: idx, value: time })}
                        >
                          <Ionicons name="time-outline" size={14} color={colors.primary} />
                          <Text style={[styles.timeBadgeText, { color: colors.primary }]}>
                            {time}
                          </Text>
                          <Ionicons name="pencil-outline" size={12} color={colors.primary} />
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>

                {/* Days of week */}
                <View
                  style={[
                    styles.settingItem,
                    { flexDirection: "column", alignItems: "flex-start" },
                  ]}
                >
                  <Text style={[styles.settingLabel, { color: colors.text, marginBottom: 8 }]}>
                    Dias da Semana
                  </Text>
                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map((label, day) => {
                      const active = (remindersConfig.daysOfWeek ?? []).includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayButton,
                            {
                              backgroundColor: active ? colors.primary : colors.border,
                              borderColor: active ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => handleToggleDay(day)}
                        >
                          <Text
                            style={[
                              styles.dayButtonText,
                              { color: active ? "#FFF" : colors.textSecondary },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Settings Sections */}
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Card style={styles.sectionCard} padding="none">
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.settingItem,
                    itemIndex < section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={item.type === "toggle" ? 1 : 0.7}
                  disabled={item.type === "toggle" || item.type === "info"}
                  accessibilityLabel={item.label}
                  accessibilityRole={
                    item.type === "navigation" || item.type === "action" ? "button" : "text"
                  }
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: colors.primary + "20" }]}>
                      <Ionicons name={item.icon} size={20} color={colors.primary} />
                    </View>
                    <View style={styles.settingContent}>
                      <View style={styles.settingLabelRow}>
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          {item.label}
                        </Text>
                        {item.badge && (
                          <View style={[styles.badge, { backgroundColor: colors.warning + "20" }]}>
                            <Text style={[styles.badgeText, { color: colors.warning }]}>
                              {item.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      {item.description && (
                        <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  {item.type === "toggle" && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onPress}
                      trackColor={{ false: colors.border, true: colors.primary + "80" }}
                      thumbColor={item.value ? colors.primary : colors.textMuted}
                      accessibilityLabel={`Alternar ${item.label}`}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: item.value }}
                    />
                  )}
                  {item.type === "navigation" && (
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  )}
                  {item.type === "action" && (
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Logout Button */}
        <Button
          title="Sair da Conta"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
          textStyle={{ color: colors.error }}
        />

        {/* Build Info */}
        <Text style={[styles.buildInfo, { color: colors.textMuted }]}>
          FisioFlow Paciente v1.0.0 • Build 1
        </Text>
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
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  profileCard: {
    marginBottom: 24,
    padding: 16,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    marginBottom: 16,
    borderColor: "#EF4444",
  },
  buildInfo: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
  },
  timesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  timeBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timeEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    width: 72,
  },
  timeEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  dayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
