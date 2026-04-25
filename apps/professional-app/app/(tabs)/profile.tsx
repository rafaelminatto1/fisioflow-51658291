import { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { useHaptics } from "@/hooks/useHaptics";
import { Button, SyncStatus } from "@/components";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/api";
import { fetchApi } from "@/lib/api";
import { ProfileHeader, ProfileSection, ProfileMenuItem, SettingsItem } from "@/components/profile";

export default function ProfileScreen() {
  const colors = useColors();
  const { user, signOut } = useAuthStore();
  const { status: syncStatus, isOnline } = useSyncStatus();
  const { light, medium, success, error } = useHaptics();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["professionalStats"],
    queryFn: () => getDashboardStats("current-professional"),
  });

  const { data: surveysData } = useQuery({
    queryKey: ["satisfactionSurveysRating"],
    queryFn: async () => {
      try {
        return await fetchApi<any>("/api/satisfaction-surveys", {
          params: { limit: 100 },
        });
      } catch {
        return null;
      }
    },
  });

  const averageRating: number | null = (() => {
    const surveys: any[] = surveysData?.data ?? [];
    if (surveys.length < 5) return null;
    const total = surveys.reduce((sum: number, s: any) => sum + (s.score ?? s.rating ?? 0), 0);
    return Math.round((total / surveys.length) * 10) / 10;
  })();

  const handleLogout = useCallback(() => {
    medium();
    Alert.alert("Sair", "Deseja realmente sair da sua conta?", [
      { text: "Cancelar", style: "cancel", onPress: () => light() },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setIsLoggingOut(true);
          try {
            await signOut();
            success();
            router.replace("/(auth)/login");
          } catch {
            error();
            Alert.alert("Erro", "Não foi possível sair. Tente novamente.");
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  }, [medium, light, signOut, success, error]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ProfileHeader
          name={user?.name || "Profissional"}
          email={user?.email}
          onAvatarPress={() => {
            medium();
            router.push("/profile-edit" as any);
          }}
          onSettingsPress={() => {
            medium();
            router.push("/(settings)/notification-preferences" as any);
          }}
          stats={{
            patients: stats?.activePatients ?? 0,
            appointments: stats?.todayAppointments ?? 0,
            completed: stats?.completedAppointments ?? 0,
          }}
        />

        <View style={styles.menuWrapper}>
          <ProfileSection title="Configurações de Perfil">
            <ProfileMenuItem
              icon="person-outline"
              label="Meus Dados"
              onPress={() => {
                medium();
                router.push("/profile-edit" as any);
              }}
            />
            <ProfileMenuItem
              icon="notifications-outline"
              label="Preferências de Notificação"
              onPress={() => {
                medium();
                router.push("/(settings)/notification-preferences" as any);
              }}
            />
            <ProfileMenuItem
              icon="business-outline"
              label="Clínica / Consultório"
              onPress={() => {
                medium();
                Alert.alert(
                  "Painel Web",
                  "As configurações avançadas da clínica devem ser realizadas via painel web.",
                );
              }}
            />
            <ProfileMenuItem
              icon="time-outline"
              label="Horários de Atendimento"
              onPress={() => {
                medium();
                router.push("/(settings)/working-hours" as any);
              }}
            />
            <ProfileMenuItem
              icon="lock-closed-outline"
              label="Segurança e Senha"
              onPress={() => {
                medium();
                router.push("/change-password" as any);
              }}
              showDivider={false}
            />
          </ProfileSection>

          <ProfileSection title="Recursos e Ferramentas">
            <ProfileMenuItem
              icon="clipboard-outline"
              label="Protocolos Clínicos"
              iconColor={colors.info}
              onPress={() => {
                medium();
                router.push("/protocols" as any);
              }}
            />
            <ProfileMenuItem
              icon="card-outline"
              label="Plano e Assinatura"
              iconColor={colors.success}
              onPress={() => {
                light();
                Linking.openURL("https://fisioflow.pages.dev/financial").catch(() =>
                  Alert.alert("Erro", "Não foi possível abrir o link."),
                );
              }}
            />
            <ProfileMenuItem
              icon="help-circle-outline"
              label="Central de Ajuda"
              iconColor={colors.warning}
              onPress={() => {
                medium();
                router.push("/(settings)/help" as any);
              }}
              showDivider={false}
            />
          </ProfileSection>

          <ProfileSection title="Preferências">
            <SettingsItem
              label="Notificações Push"
              value={pushEnabled}
              onToggle={(val) => {
                medium();
                setPushEnabled(val);
              }}
            />
            <SettingsItem
              label="Lembretes de Agenda"
              value={remindersEnabled}
              onToggle={(val) => {
                medium();
                setRemindersEnabled(val);
              }}
            />
            <SettingsItem
              label="Modo Escuro"
              value={darkModeEnabled}
              onToggle={(val) => {
                medium();
                setDarkModeEnabled(val);
                Alert.alert(
                  "Aviso",
                  "O suporte ao modo escuro dinâmico será aplicado na próxima reinicialização.",
                );
              }}
            />
          </ProfileSection>

          {/* Connection Status Card */}
          <View
            style={[
              styles.statusCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: isOnline ? colors.success : colors.error },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {isOnline ? "Conectado ao servidor" : "Modo offline ativo"}
              </Text>
            </View>
            <SyncStatus status={syncStatus} isOnline={isOnline} />
          </View>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.error + "30" }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>
              {isLoggingOut ? "Saindo..." : "Sair da Conta"}
            </Text>
          </TouchableOpacity>

          <View style={styles.version}>
            <Text style={[styles.versionText, { color: colors.textMuted }]}>
              FISIOFLOW • Versão 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  menuWrapper: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  statusCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
  },
  version: {
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.5,
  },
});
