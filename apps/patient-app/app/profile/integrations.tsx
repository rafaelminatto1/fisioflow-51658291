/**
 * Wearable Integrations Page
 * Patient connects/disconnects Garmin, Strava, Oura Ring
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { Card } from "@/components";
import { Spacing } from "@/constants/spacing";
import { wearablesApi } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api";
import { log } from "@/lib/logger";

type Integration = {
  provider: string;
  connected_at: string;
  last_synced_at: string | null;
};

const PROVIDERS = [
  {
    id: "strava",
    name: "Strava",
    description: "Corrida, ciclismo e atividades ao ar livre",
    icon: "bicycle" as const,
    color: "#FC4C02",
    dataTypes: ["Distância", "Pace", "FC", "Carga de treino"],
  },
  {
    id: "oura",
    name: "Oura Ring",
    description: "Sono, recuperação e HRV",
    icon: "moon" as const,
    color: "#6366f1",
    dataTypes: ["Qualidade do sono", "HRV", "FC em repouso", "Prontidão"],
  },
  {
    id: "garmin",
    name: "Garmin",
    description: "Relógio esportivo Garmin",
    icon: "watch" as const,
    color: "#007CC3",
    dataTypes: ["Passos", "FC", "VO2 Max", "Stress"],
  },
];

export default function IntegrationsPage() {
  const colors = useColors();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const loadIntegrations = useCallback(async () => {
    try {
      const data = await wearablesApi.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      log.warn("Failed to load wearable integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const getConnected = (provider: string) => integrations.find((i) => i.provider === provider);

  const handleConnect = async (provider: string) => {
    if (provider === "garmin") {
      Alert.alert(
        "Garmin Connect",
        "A integração Garmin requer autenticação no navegador. Você será redirecionado.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Continuar",
            onPress: async () => {
              const url = `${getApiBaseUrl()}/api/wearables/oauth/garmin/start`;
              await Linking.openURL(url);
            },
          },
        ],
      );
      return;
    }

    setConnecting(provider);
    try {
      const url = `${getApiBaseUrl()}/api/wearables/oauth/${provider}/start`;
      await Linking.openURL(url);
      // After returning from browser, reload integrations
      setTimeout(() => {
        loadIntegrations();
        setConnecting(null);
      }, 2000);
    } catch (err) {
      log.error(`Failed to start ${provider} OAuth:`, err);
      setConnecting(null);
    }
  };

  const handleDisconnect = (provider: string, name: string) => {
    Alert.alert(
      `Desconectar ${name}`,
      "Os dados já sincronizados serão mantidos. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desconectar",
          style: "destructive",
          onPress: async () => {
            try {
              await wearablesApi.disconnectProvider(provider);
              setIntegrations((prev) => prev.filter((i) => i.provider !== provider));
            } catch (err) {
              log.error(`Failed to disconnect ${provider}:`, err);
              Alert.alert("Erro", "Não foi possível desconectar. Tente novamente.");
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "Nunca";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Integrações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Conecte seus dispositivos para que seu fisioterapeuta possa acompanhar sua evolução com
          dados reais de atividade.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          PROVIDERS.map((provider) => {
            const connected = getConnected(provider.id);
            const isConnecting = connecting === provider.id;

            return (
              <Card key={provider.id} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={[styles.providerIcon, { backgroundColor: provider.color + "20" }]}>
                    <Ionicons name={provider.icon} size={24} color={provider.color} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: colors.text }]}>
                      {provider.name}
                    </Text>
                    <Text style={[styles.providerDesc, { color: colors.textSecondary }]}>
                      {provider.description}
                    </Text>
                  </View>
                  {connected ? (
                    <View
                      style={[styles.connectedBadge, { backgroundColor: colors.success + "20" }]}
                    >
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={[styles.connectedText, { color: colors.success }]}>Ativo</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.dataTypes}>
                  {provider.dataTypes.map((dt) => (
                    <View
                      key={dt}
                      style={[styles.dataTypeBadge, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.dataTypeText, { color: colors.textSecondary }]}>
                        {dt}
                      </Text>
                    </View>
                  ))}
                </View>

                {connected && (
                  <Text style={[styles.syncInfo, { color: colors.textSecondary }]}>
                    Conectado em {formatDate(connected.connected_at)} · Último sync:{" "}
                    {formatDate(connected.last_synced_at)}
                  </Text>
                )}

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: connected ? colors.errorLight : provider.color,
                    },
                  ]}
                  onPress={() =>
                    connected
                      ? handleDisconnect(provider.id, provider.name)
                      : handleConnect(provider.id)
                  }
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <ActivityIndicator size="small" color={connected ? colors.error : "#FFF"} />
                  ) : (
                    <>
                      <Ionicons
                        name={connected ? "unlink" : "link"}
                        size={16}
                        color={connected ? colors.error : "#FFF"}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          { color: connected ? colors.error : "#FFF" },
                        ]}
                      >
                        {connected ? "Desconectar" : "Conectar"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </Card>
            );
          })
        )}

        <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Seus dados de saúde são compartilhados apenas com seu fisioterapeuta e utilizados
            exclusivamente para acompanhamento clínico.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.screen,
  },
  title: { fontSize: 18, fontWeight: "700" },
  content: { padding: Spacing.screen, gap: Spacing.gap },
  sectionLabel: { fontSize: 13, lineHeight: 20 },
  providerCard: { padding: Spacing.card, gap: 12 },
  providerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  providerDesc: { fontSize: 12 },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  connectedText: { fontSize: 12, fontWeight: "600" },
  dataTypes: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dataTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dataTypeText: { fontSize: 11 },
  syncInfo: { fontSize: 11 },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionButtonText: { fontSize: 14, fontWeight: "600" },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: Spacing.card,
    borderRadius: 12,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
