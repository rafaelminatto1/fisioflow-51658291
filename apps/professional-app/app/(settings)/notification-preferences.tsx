import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Card, Button } from "@/components";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchApi } from "@/lib/api";
import type { ApiResponse } from "@/types/api";

/**
 * Espelha as colunas de `notification_preferences`.
 *
 * A tela antes propunha 4 categorias com horário de silêncio individual e
 * salvava em `/api/settings/notifications/:id` — rota inexistente (404), então
 * nada nunca foi persistido. O modelo real é este: seis chaves por tipo de
 * evento, um horário de silêncio global e fim de semana. `therapist_messages` e
 * o silêncio são de fato lidos no envio de push (`lib/whatsapp/inboxPush.ts`),
 * ou seja, estes controles agora têm efeito.
 */
interface NotificationPrefs {
  appointment_reminders: boolean;
  exercise_reminders: boolean;
  progress_updates: boolean;
  system_alerts: boolean;
  therapist_messages: boolean;
  payment_reminders: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  weekend_notifications: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  appointment_reminders: true,
  exercise_reminders: true,
  progress_updates: true,
  system_alerts: true,
  therapist_messages: true,
  payment_reminders: true,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
  weekend_notifications: false,
};

const TOGGLES: {
  key: keyof NotificationPrefs;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "appointment_reminders",
    title: "Agendamentos",
    description: "Lembretes de consultas e alterações na agenda.",
    icon: "calendar-outline",
  },
  {
    key: "therapist_messages",
    title: "Mensagens de pacientes",
    description: "Novas mensagens recebidas no inbox.",
    icon: "chatbubbles-outline",
  },
  {
    key: "exercise_reminders",
    title: "Exercícios",
    description: "Lembretes de programa domiciliar.",
    icon: "barbell-outline",
  },
  {
    key: "progress_updates",
    title: "Evolução",
    description: "Atualizações de progresso e marcos do paciente.",
    icon: "trending-up-outline",
  },
  {
    key: "payment_reminders",
    title: "Financeiro",
    description: "Cobranças e pagamentos pendentes.",
    icon: "cash-outline",
  },
  {
    key: "system_alerts",
    title: "Sistema",
    description: "Avisos técnicos e de segurança.",
    icon: "settings-outline",
  },
];

function parseTime(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(hours) ? hours : 22, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date;
}

export default function NotificationPreferencesScreen() {
  const colors = useColors();
  const [preferences, setPreferences] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<"start" | "end" | null>(null);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi<ApiResponse<Partial<NotificationPrefs>>>(
        "/api/notification-preferences",
      );
      setPreferences({ ...DEFAULT_PREFS, ...(response.data || {}) });
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      Alert.alert("Erro", "Não foi possível carregar suas preferências de notificações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchApi("/api/notification-preferences", {
        method: "PUT",
        data: preferences,
      });
      Alert.alert("Sucesso", "Suas preferências foram salvas.");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      Alert.alert("Erro", "Não foi possível salvar suas preferências.");
    } finally {
      setIsSaving(false);
    }
  };

  const onTimeChange = (_event: unknown, selectedDate?: Date) => {
    if (selectedDate && showTimePicker) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setPreferences((prev) => ({
        ...prev,
        [showTimePicker === "start" ? "quiet_hours_start" : "quiet_hours_end"]: `${hours}:${minutes}`,
      }));
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Preferências de Notificações</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Personalize quais alertas você deseja receber e em quais horários.
          </Text>
        </View>

        {TOGGLES.map((toggle) => (
          <Card key={toggle.key} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <View style={styles.categoryTitleContainer}>
                <Ionicons name={toggle.icon} size={22} color={colors.primary} />
                <Text style={[styles.categoryTitle, { color: colors.text }]}>{toggle.title}</Text>
              </View>
              <Switch
                value={Boolean(preferences[toggle.key])}
                onValueChange={(value) =>
                  setPreferences((prev) => ({ ...prev, [toggle.key]: value }))
                }
                trackColor={{ false: colors.border, true: colors.primary }}
                accessibilityLabel={`Habilitar notificações de ${toggle.title}`}
              />
            </View>
            <Text style={[styles.categoryDescription, { color: colors.textSecondary }]}>
              {toggle.description}
            </Text>
          </Card>
        ))}

        <Card style={styles.categoryCard}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryTitleContainer}>
              <Ionicons name="moon-outline" size={22} color={colors.primary} />
              <Text style={[styles.categoryTitle, { color: colors.text }]}>
                Horário de Silêncio
              </Text>
            </View>
          </View>
          <View style={styles.timeRows}>
            <TouchableOpacity
              style={[styles.timeButton, { backgroundColor: colors.primary + "10" }]}
              onPress={() => setShowTimePicker("start")}
            >
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Início:</Text>
              <Text style={[styles.timeValue, { color: colors.primary }]}>
                {preferences.quiet_hours_start}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.timeButton, { backgroundColor: colors.primary + "10" }]}
              onPress={() => setShowTimePicker("end")}
            >
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Fim:</Text>
              <Text style={[styles.timeValue, { color: colors.primary }]}>
                {preferences.quiet_hours_end}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.quietHoursHeader, styles.weekendRow]}>
            <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>
              Notificar nos fins de semana
            </Text>
            <Switch
              value={preferences.weekend_notifications}
              onValueChange={(value) =>
                setPreferences((prev) => ({ ...prev, weekend_notifications: value }))
              }
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Notificar nos fins de semana"
            />
          </View>
        </Card>

        <Button
          title="Salvar Alterações"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveButton}
        />

        {showTimePicker && (
          <DateTimePicker
            value={parseTime(
              showTimePicker === "start"
                ? preferences.quiet_hours_start
                : preferences.quiet_hours_end,
            )}
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
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  categoryCard: { marginBottom: 16, padding: 16 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  categoryTitleContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  categoryTitle: { fontSize: 18, fontWeight: "600" },
  categoryDescription: { fontSize: 13, lineHeight: 18 },
  quietHoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekendRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 16,
    marginBottom: 0,
  },
  quietHoursLabel: { fontSize: 14, fontWeight: "600" },
  timeRows: { flexDirection: "row", gap: 12 },
  timeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeLabel: { fontSize: 13 },
  timeValue: { fontSize: 15, fontWeight: "bold" },
  saveButton: { marginTop: 24, marginBottom: 32 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
