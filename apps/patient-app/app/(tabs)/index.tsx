/**
 * Dashboard Screen - Patient App
 * Home screen with today's exercises, appointments, and quick actions
 */

import { useState, useEffect } from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { useGamification } from "@/hooks/useGamification";
import { Card, NotificationPermissionModal, SyncIndicator, LinearProgress } from "@/components";
import { Spacing } from "@/constants/spacing";
import * as Notifications from "expo-notifications";
import { useExercises } from "@/hooks/useExercises";
import { useAppointments } from "@/hooks/useAppointments";
import { useTelemedicine } from "@/hooks/useTelemedicine";
import { Linking } from "react-native";

const SCREEN_PADDING = Spacing.screen;
const CARD_GAP = Spacing.gap;
const HALF_CARD_WIDTH = (Dimensions.get("window").width - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const FULL_CARD_WIDTH = Dimensions.get("window").width - SCREEN_PADDING * 2;

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "1",
    label: "Exercícios",
    icon: "barbell-outline",
    route: "/(tabs)/exercises",
    color: "#22c55e",
  },
  {
    id: "2",
    label: "Evoluções",
    icon: "trending-up-outline",
    route: "/(tabs)/progress",
    color: "#3b82f6",
  },
  {
    id: "3",
    label: "Consultas",
    icon: "calendar-outline",
    route: "/(tabs)/appointments",
    color: "#0891b2",
  },
  {
    id: "4",
    label: "Perfil",
    icon: "person-outline",
    route: "/(tabs)/profile",
    color: "#059669",
  },
];

export default function DashboardScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const {
    currentLevel,
    currentXp,
    xpPerLevel,
    progressPercentage,
    isLoading: gamificationLoading,
  } = useGamification();
  const { data: exercises = [], isLoading: exercisesLoading } = useExercises();
  const { data: upcomingAppointments = [], isLoading: appointmentsLoading } = useAppointments(true);
  const { activeRoom } = useTelemedicine();

  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    // Check if notification prompt was already shown
    AsyncStorage.getItem("notificationPromptShown").then(async (value) => {
      if (!value && user?.id) {
        // Check current permission status
        const { status } = await Notifications.getPermissionsAsync();
        if (status === "undetermined") {
          setShowNotificationPrompt(true);
        }
      }
    });
  }, [user?.id]);

  const handleEnableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === "granted") {
      await AsyncStorage.setItem("notificationPromptShown", "true");
    }
    setShowNotificationPrompt(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const getTodayLabel = () => {
    const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
    return today.charAt(0).toUpperCase() + today.slice(1);
  };

  const nextAppointment = upcomingAppointments[0];
  const completedCount = exercises.filter((e) => e.completed).length;
  const totalCount = exercises.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const xpRemaining = Math.max(xpPerLevel - currentXp, 0);
  const streak = 0; // Temporário - viria do perfil gamificado se implementado na API

  const getNextAppointmentLabel = () => {
    if (!nextAppointment) return null;

    const apptDate = new Date(nextAppointment.date);
    if (isNaN(apptDate.getTime())) return null;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = apptDate.toDateString() === today.toDateString();
    const isTomorrow = apptDate.toDateString() === tomorrow.toDateString();

    if (isToday) return `Hoje às ${nextAppointment.time}`;
    if (isTomorrow) return `Amanhã às ${nextAppointment.time}`;

    return format(apptDate, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  const isLoading = gamificationLoading || exercisesLoading || appointmentsLoading;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Sync Indicator */}
      <SyncIndicator />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeRoom && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => activeRoom.meeting_url && Linking.openURL(activeRoom.meeting_url)}
            style={styles.telemedicineWrapper}
          >
            <Card style={[styles.activeRoomCard, { backgroundColor: colors.success }]}>
              <View style={styles.telemedicineContent}>
                <View style={styles.telemedicineIcon}>
                  <Ionicons name="videocam" size={24} color="#fff" />
                </View>
                <View style={styles.telemedicineText}>
                  <Text style={styles.telemedicineTitle}>Consulta Online Ativa</Text>
                  <Text style={styles.telemedicineSub}>Toque para entrar na sala</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </Card>
          </TouchableOpacity>
        )}
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()}, {user?.name?.split(" ")[0] || "Paciente"} 👋
            </Text>
            <Text style={[styles.date, { color: colors.text }]}>{getTodayLabel()}</Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.levelBadge, { backgroundColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={styles.levelText}>Lvl {currentLevel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarText}>
                    {user?.name?.charAt(0).toUpperCase() || "P"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Level Progress Bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpHeader}>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
              Progresso do Nível
            </Text>
            <Text style={[styles.xpValue, { color: colors.text }]}>
              {currentXp}/{xpPerLevel} XP
            </Text>
          </View>
          <LinearProgress
            progress={progressPercentage / 100}
            color={colors.primary}
            style={styles.xpBar}
          />
          <Text style={[styles.xpHint, { color: colors.textSecondary }]}>
            Faltam {xpRemaining} XP para o próximo nível
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Today's Progress */}
            <View style={styles.statsGrid}>
              <StatCard
                icon="checkmark-circle"
                label="Feitos hoje"
                value={`${completedCount}/${totalCount}`}
                color={progress === 100 ? colors.success : colors.primary}
                colors={colors}
              />
              <StatCard
                icon="flame"
                label="Sequência"
                value={`${streak} dias`}
                color={colors.warning}
                colors={colors}
              />
              <StatCard
                icon="calendar"
                label="Próxima consulta"
                value={getNextAppointmentLabel() || "--"}
                color={colors.info}
                colors={colors}
                fullWidth
              />
            </View>

            {/* Today's Exercises */}
            {exercises.length > 0 ? (
              <Card style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "20" }]}>
                      <Ionicons name="barbell" size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.text }]} numberOfLines={1}>
                        Exercícios de Hoje
                      </Text>
                      <Text
                        style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        Plano Atual
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/exercises")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.exercisesList}>
                  {exercises.slice(0, 3).map((exercise, index) => (
                    <View
                      key={exercise.id}
                      style={[
                        styles.exerciseItem,
                        {
                          backgroundColor: exercise.completed
                            ? colors.success + "10"
                            : colors.surfaceHover,
                          borderColor: exercise.completed ? colors.success + "30" : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.exerciseIndex,
                          {
                            backgroundColor: exercise.completed
                              ? colors.success
                              : colors.primary + "20",
                          },
                        ]}
                      >
                        {exercise.completed ? (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.exerciseIndexText, { color: colors.primary }]}>
                            {index + 1}
                          </Text>
                        )}
                      </View>

                      <View style={styles.exerciseInfo}>
                        <Text
                          style={[
                            styles.exerciseName,
                            {
                              color: exercise.completed ? colors.success : colors.text,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {exercise.exercise?.name || "Exercício"}
                        </Text>
                        <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
                          {exercise.sets} séries × {exercise.reps} reps
                        </Text>
                      </View>

                      <Ionicons
                        name={exercise.completed ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={exercise.completed ? colors.success : colors.textMuted}
                      />
                    </View>
                  ))}

                  {exercises.length > 3 && (
                    <TouchableOpacity
                      style={styles.seeMoreButton}
                      onPress={() => router.push("/(tabs)/exercises")}
                    >
                      <Text style={[styles.seeMoreText, { color: colors.primary }]}>
                        Ver todos {exercises.length} exercícios
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}

                  {progress === 100 && totalCount > 0 && (
                    <View
                      style={[styles.completedBanner, { backgroundColor: colors.success + "10" }]}
                    >
                      <Ionicons name="trophy" size={24} color={colors.success} />
                      <View style={styles.completedBannerText}>
                        <Text style={[styles.completedTitle, { color: colors.success }]}>
                          Parabéns!
                        </Text>
                        <Text style={[styles.completedSubtitle, { color: colors.textSecondary }]}>
                          Você completou todos os exercícios de hoje
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card>
            ) : (
              <Card style={styles.emptyCard}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem exercícios hoje</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Quando seu plano estiver disponível, ele aparecerá aqui.
                </Text>
              </Card>
            )}

            {/* Next Appointment Card */}
            {nextAppointment ? (
              <Card style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={[styles.appointmentIcon, { backgroundColor: colors.info + "20" }]}>
                    <Ionicons name="calendar" size={24} color={colors.info} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={[styles.appointmentLabel, { color: colors.textSecondary }]}>
                      Próxima Consulta
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={[styles.appointmentTime, { color: colors.text }]}>
                        {getNextAppointmentLabel() || "--"}
                      </Text>
                      {nextAppointment.isGroup && (
                        <View
                          style={[styles.groupBadge, { backgroundColor: colors.primary + "20" }]}
                        >
                          <Text style={[styles.groupBadgeText, { color: colors.primary }]}>
                            Grupo
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.appointmentDetails, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {nextAppointment.type} com {nextAppointment.professionalName}
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <Card style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={[styles.appointmentIcon, { backgroundColor: colors.surfaceHover }]}>
                    <Ionicons name="calendar" size={22} color={colors.textSecondary} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={[styles.appointmentLabel, { color: colors.textSecondary }]}>
                      Próxima Consulta
                    </Text>
                    <Text style={[styles.appointmentTime, { color: colors.text }]}>
                      Nenhuma consulta agendada
                    </Text>
                    <Text
                      style={[styles.appointmentDetails, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      Agende uma nova consulta quando precisar
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Quick Actions */}
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + "20" }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Notification Permission Modal */}
      <NotificationPermissionModal
        visible={showNotificationPrompt}
        onClose={() => setShowNotificationPrompt(false)}
        onEnable={handleEnableNotifications}
      />
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  colors,
  fullWidth = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  colors: any;
  fullWidth?: boolean;
}) {
  return (
    <Card
      style={[
        styles.statCard,
        fullWidth && styles.statCardFull,
        { backgroundColor: colors.surface },
      ]}
    >
      <View style={styles.statHeader}>
        <View style={[styles.statIconWrap, { backgroundColor: color + "15" }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.screen,
    paddingBottom: 32,
  },
  telemedicineWrapper: {
    paddingHorizontal: Spacing.screen,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  activeRoomCard: {
    padding: 16,
    borderRadius: 16,
  },
  telemedicineContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  telemedicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  telemedicineText: {
    flex: 1,
  },
  telemedicineTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  telemedicineSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  xpContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  xpValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  xpBar: {
    height: 8,
    borderRadius: 4,
  },
  xpHint: {
    marginTop: 6,
    fontSize: 12,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  date: {
    fontSize: 24,
    fontWeight: "700",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    marginBottom: 20,
  },
  statCard: {
    width: HALF_CARD_WIDTH,
    padding: 14,
    alignItems: "flex-start",
    gap: 10,
    minHeight: 96,
  },
  statCardFull: {
    width: FULL_CARD_WIDTH,
    minHeight: 88,
  },
  statHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 12,
  },
  sectionCard: {
    marginBottom: 16,
    padding: Spacing.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  exercisesList: {
    gap: 10,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIndexText: {
    fontSize: 13,
    fontWeight: "700",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 12,
  },
  seeMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    marginTop: 6,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  completedBannerText: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  completedSubtitle: {
    fontSize: 13,
  },
  emptyCard: {
    padding: Spacing.card,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  appointmentCard: {
    padding: Spacing.card,
    marginBottom: 16,
  },
  appointmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appointmentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentLabel: {
    fontSize: 13,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  appointmentDetails: {
    fontSize: 14,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: HALF_CARD_WIDTH,
    minHeight: 104,
    aspectRatio: 0.9,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomSpacing: {
    height: 16,
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
