import { palette } from "@/constants/theme";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useAuthStore } from "@/store/auth";
import { Card, Button } from "@/components";
import { dataDeletionService } from "@/lib/services/dataDeletionService";
import type { DeletionRequestView } from "@/lib/services/dataDeletionService";

export default function DataDeletionScreen() {
  const colors = useColors();
  const { user } = useAuthStore();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<DeletionRequestView | null>(null);

  useEffect(() => {
    loadDeletionStatus();
  }, []);

  const loadDeletionStatus = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const status = await dataDeletionService.getDeletionStatus(user.email);
      setPendingRequest(status);
    } catch (error) {
      console.error("Error loading deletion status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user?.email) return;

    if (!password) {
      Alert.alert("Erro", "Por favor, confirme sua senha para prosseguir com a exclusão da conta.");
      return;
    }

    Alert.alert(
      "Confirmar solicitação",
      "Seus dados cadastrais serão excluídos após análise. Prontuários e evoluções permanecem retidos pelo prazo legal. Deseja continuar?",
      [
        { text: "Não, cancelar", style: "cancel" },
        {
          text: "Sim, solicitar",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              const request = await dataDeletionService.requestDeletion(
                user.email,
                "cadastral",
                user.name,
              );
              setPendingRequest(request);
              Alert.alert(
                "Solicitação Registrada",
                request.responseSummary ||
                  "Seu pedido foi registrado e será analisado em até 15 dias úteis.",
                [{ text: "Entendido" }],
              );
            } catch (error: any) {
              Alert.alert("Erro", error.message || "Não foi possível processar seu pedido.");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (pendingRequest) {
    const requestedAt = new Date(pendingRequest.createdAt).toLocaleDateString("pt-BR");
    const dueAt = pendingRequest.dueAt
      ? new Date(pendingRequest.dueAt).toLocaleDateString("pt-BR")
      : null;

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Card style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="time-outline" size={32} color={colors.warning} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                Solicitação registrada
              </Text>
            </View>
            <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
              Pedido enviado em {requestedAt}
              {dueAt ? ` — prazo de resposta até ${dueAt}` : ""}.
            </Text>
            {pendingRequest.responseSummary && (
              <Text style={[styles.gracePeriodInfo, { color: colors.textMuted }]}>
                {pendingRequest.responseSummary}
              </Text>
            )}
            {pendingRequest.legalBasis && (
              <Text style={[styles.gracePeriodInfo, { color: colors.textMuted }]}>
                Base legal: {pendingRequest.legalBasis}
              </Text>
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Excluir Minha Conta</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sentimos muito que você queira nos deixar. Entenda o processo de remoção de dados.
          </Text>
        </View>

        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={24} color={palette.error} />
            <Text style={[styles.warningTitle, { color: palette.error }]}>
              Atenção: Ação Permanente
            </Text>
          </View>
          <Text style={[styles.warningDescription, { color: colors.textSecondary }]}>
            Ao confirmar esta solicitação:
          </Text>
          <View style={styles.bulletList}>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Seus dados cadastrais (nome, e-mail, telefone) serão excluídos após análise.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Você perderá o acesso à plataforma FisioFlow Pro.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Prontuários, evoluções e exames NÃO são apagados: a Lei 13.787/2018 (art. 6) e a
              Resolução COFFITO 415/2012 exigem retenção mínima de 20 anos.
            </Text>
            <Text style={[styles.bulletPoint, { color: colors.textSecondary }]}>
              • Dados financeiros e históricos de pagamentos também são mantidos por prazo legal.
            </Text>
          </View>
          <Text style={[styles.recommendation, { color: colors.text }]}>
            Recomendamos que você realize uma{" "}
            <Text style={{ fontWeight: "bold" }}>exportação completa</Text> dos seus dados antes de
            prosseguir.
          </Text>
        </Card>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.text }]}>Confirme sua senha</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Digite sua senha atual"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* O campo de motivo saiu: `lgpd_deletion_requests` não tem coluna para
              ele, então era texto que o usuário escrevia e ninguém jamais lia. */}

          <Button
            title="Solicitar Exclusão Permanentemente"
            onPress={handleRequestDeletion}
            loading={isProcessing}
            style={styles.deleteButton}
            textStyle={{ color: palette.card }}
            variant="primary" // In a real theme this might be 'danger'
          />
        </View>

        <Text style={[styles.graceInfo, { color: colors.textMuted }]}>
          O pedido é analisado pelo encarregado de dados em até 15 dias úteis (LGPD art. 18). Você
          receberá a resposta com a decisão e a base legal aplicada.
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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  warningCard: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
    padding: 16,
    marginBottom: 24,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  warningDescription: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  bulletList: {
    marginBottom: 16,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  recommendation: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 16,
    marginBottom: 32,
    textAlignVertical: "top",
  },
  deleteButton: {
    backgroundColor: palette.error,
    borderColor: palette.error,
  },
  graceInfo: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  statusCard: {
    padding: 24,
    alignItems: "center",
    marginTop: 40,
  },
  statusHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 12,
  },
  statusDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  gracePeriodInfo: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  cancelButton: {
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
