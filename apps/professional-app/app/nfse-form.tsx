import { useState, useEffect, useMemo } from "react";
import { format, addDays, isWeekend, isMonday, isWednesday, isFriday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useGenerateNFSe } from "@/hooks/useNFSe";
import { usePatients } from "@/hooks/usePatients";
import { sendWhatsAppTemplate } from "@/lib/api";
import { generateReimbursementReportPDF } from "@/lib/services/pdfGenerator";

export default function NFSeForm() {
  const colors = useColors();
  const router = useRouter();
  const { light, medium, success, error: hapticError } = useHaptics();

  const generateMutation = useGenerateNFSe();
  const { data: patients = [], isLoading: isLoadingPatients } = usePatients({ status: "active" });

  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [discriminacao, setDiscriminacao] = useState("Serviços de Fisioterapia");
  const [tomadorNome, setTomadorNome] = useState("");
  const [tomadorCpf, setTomadorCpf] = useState("");
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Estados Reembolso Inteligente
  const [usePlannedSessions, setUsePlannedSessions] = useState(false);
  const [sessionsCount, setSessionsCount] = useState("10");
  const [plannedStartDate, setPlannedStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tussCode, setTussCode] = useState("50000160");
  const [clinicalFocus, setClinicalFocus] = useState("Reabilitação ortopédica, pós-operatório e esportivo");
  const [medicalReferralDate, setMedicalReferralDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const calculateDates = (start: string, count: number) => {
    let dates: Date[] = [];
    let current = parseISO(start);
    while (dates.length < count) {
      if (!isWeekend(current) && (isMonday(current) || isWednesday(current) || isFriday(current))) {
        dates.push(new Date(current));
      }
      current = addDays(current, 1);
    }
    return dates;
  };

  useEffect(() => {
    if (patientId) {
      const patient = patients.find((p) => p.id === patientId);
      if (patient) {
        const insurance = (patient as any).insurance;
        let info = "";

        if (usePlannedSessions) {
          const count = parseInt(sessionsCount) || 0;
          const dates = calculateDates(plannedStartDate, count);
          const formattedDates = dates.map((d) => format(d, "dd/MM/yyyy")).join(", ");

          info = `Paciente ${patient.name} CPF de número ${patient.document || "---"} realizou ${count} sessões de fisioterapia musculoesquelética nos dias ${formattedDates} (realizou o código TUSS: ${tussCode} ). E efetuou o pagamento no valor de ${getDisplayValor()} para a empresa Mooca Fisioterapia RA Ltda, CNPJ: 54.836.577/0001-67, Rua Manuel Vieira de Sousa, 166 – Mooca – São Paulo – CEP: 03124-110. Conselho: CREFITO-3 – Nome: Amanda Hitomi Notoya Minatto – Número do conselho: 215954 – F SP – Telefone: (11) 93433-5858.`;
        } else {
          info = "Serviços de Fisioterapia";
          if (insurance?.provider) {
            info += `\n\n[PARA FINS DE REEMBOLSO]\nConvênio: ${insurance.provider}`;
            if (insurance.plan) info += ` | Plano: ${insurance.plan}`;
            if (insurance.cardNumber) info += ` | Carteirinha: ${insurance.cardNumber}`;
          }
        }
        setDiscriminacao(info);
      }
    } else {
      setDiscriminacao("Serviços de Fisioterapia");
    }
  }, [patientId, patients, usePlannedSessions, sessionsCount, plannedStartDate, tussCode, valorServico]);

  const getDisplayValor = () => {
    if (!valorServico) return "";
    const val = parseFloat(valorServico) / 100;
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleValorChange = (text: string) => {
    setValorServico(text.replace(/\D/g, ""));
  };

  const validate = () => {
    if (!valorServico || parseFloat(valorServico) <= 0) {
      Alert.alert("Erro", "Informe o valor do serviço.");
      return false;
    }
    if (!discriminacao.trim()) {
      Alert.alert("Erro", "Informe a discriminação do serviço.");
      return false;
    }
    if (usePlannedSessions && medicalReferralDate && plannedStartDate < medicalReferralDate) {
      Alert.alert(
        "Atenção com as Datas",
        "A data de início das sessões deve ser posterior à data do pedido médico para garantir o reembolso. Deseja prosseguir mesmo assim?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, prosseguir", style: "destructive", onPress: () => handleSubmit() }
        ]
      );
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    light();
    if (!validate()) {
      hapticError();
      return;
    }
    medium();

    try {
      const record = await generateMutation.mutateAsync({
        patient_id: patientId || undefined,
        valor_servico: parseFloat(valorServico) / 100,
        discriminacao: discriminacao.trim(),
        tomador_nome: tomadorNome.trim() || patientName || undefined,
        tomador_cpf_cnpj: tomadorCpf.replace(/\D/g, "") || undefined,
      });
      success();

      // Envio automático via WhatsApp
      if (patientId) {
        const patient = patients.find((p) => p.id === patientId);
        if (patient?.phone) {
          sendWhatsAppTemplate({
            patient_id: patientId,
            template_key: "nfse_gerada",
            variables: {
              name: patient.name.split(" ")[0],
              amount: new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(parseFloat(valorServico) / 100),
              link: record.link_nfse || "Disponível no seu e-mail",
            },
          }).catch((e) => console.error("Erro ao enviar WhatsApp NFS-e:", e));
        }
      }

      Alert.alert("NFS-e gerada!", `RPS nº ${record.numero_rps}\nStatus: ${record.status}`, [
        { 
          text: "Gerar Relatório de Reembolso", 
          onPress: async () => {
            const patient = patients.find((p) => p.id === patientId);
            if (patient) {
              const count = parseInt(sessionsCount) || 1;
              const dates = calculateDates(plannedStartDate, count);
              await generateReimbursementReportPDF(patient as any, {
                sessionsCount: count,
                startDate: dates[0].toISOString(),
                endDate: dates[dates.length - 1].toISOString(),
                tussCode,
                clinicalFocus
              });
            }
            router.back();
          }
        },
        { text: "Apenas OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      hapticError();
      Alert.alert("Erro", e.message ?? "Não foi possível gerar a NFS-e.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Emitir NFS-e",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          {/* Info */}
          <View
            style={[
              styles.infoBox,
              { backgroundColor: colors.warningLight ?? "#FEF3C7", borderColor: "#F59E0B" },
            ]}
          >
            <Ionicons name="information-circle" size={18} color="#92400E" />
            <Text style={[styles.infoText, { color: "#92400E" }]}>
              A NFS-e será gerada com as configurações da sua clínica cadastradas no painel web.
            </Text>
          </View>

          {/* Toggle Reembolso Especial */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: 16 },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Reembolso Inteligente</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  light();
                  setUsePlannedSessions(!usePlannedSessions);
                }}
              >
                <Ionicons
                  name={usePlannedSessions ? "toggle" : "toggle-outline"}
                  size={32}
                  color={usePlannedSessions ? colors.primary : colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {usePlannedSessions && (
              <View style={styles.cardBody}>
                <Text style={[styles.label, { marginTop: 0, color: colors.text }]}>
                  Cód. TUSS Padrão
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={tussCode}
                  onChangeText={setTussCode}
                  keyboardType="numeric"
                />

                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { marginTop: 0, color: colors.text }]}>Sessões</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={sessionsCount}
                      onChangeText={setSessionsCount}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={[styles.label, { marginTop: 0, color: colors.text }]}>
                      Início (AAAA-MM-DD)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={plannedStartDate}
                      onChangeText={setPlannedStartDate}
                      placeholder="Ex: 2024-05-10"
                    />
                  </View>
                </View>

                <Text style={[styles.label, { marginTop: 12, color: colors.text }]}>
                  Data do Pedido Médico (AAAA-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={medicalReferralDate}
                  onChangeText={setMedicalReferralDate}
                  placeholder="Data que consta no encaminhamento"
                />
                
                <Text style={[styles.label, { marginTop: 12, color: colors.text }]}>
                  Foco Clínico
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={clinicalFocus}
                  onChangeText={setClinicalFocus}
                />
                
                <Text style={[styles.hint, { color: colors.textMuted }]}>
                  * As datas serão geradas 3x por semana (Seg/Qua/Sex) em dias úteis.
                </Text>
              </View>
            )}
          </View>

          {/* Paciente */}
          <Text style={[styles.label, { color: colors.text }]}>Paciente (opcional)</Text>
          <TouchableOpacity
            style={[
              styles.pickerBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() => {
              light();
              setShowPatientPicker(true);
            }}
          >
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text
              style={[
                styles.pickerBtnText,
                { color: patientName ? colors.text : colors.textMuted },
              ]}
            >
              {patientName || "Selecionar paciente..."}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Valor */}
          <Text style={[styles.label, { color: colors.text }]}>Valor do serviço *</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="R$ 0,00"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={getDisplayValor()}
            onChangeText={handleValorChange}
          />

          {/* Discriminação */}
          <Text style={[styles.label, { color: colors.text }]}>Discriminação do serviço *</Text>
          <TextInput
            style={[
              styles.inputMulti,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            multiline
            numberOfLines={2}
            value={discriminacao}
            onChangeText={setDiscriminacao}
            placeholder="Descreva o serviço prestado..."
            placeholderTextColor={colors.textMuted}
          />

          {/* Tomador */}
          <Text style={[styles.label, { color: colors.text }]}>Nome do tomador</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Nome do tomador (opcional)"
            placeholderTextColor={colors.textMuted}
            value={tomadorNome}
            onChangeText={setTomadorNome}
          />

          <Text style={[styles.label, { color: colors.text }]}>CPF/CNPJ do tomador</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="000.000.000-00 (opcional)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={tomadorCpf}
            onChangeText={setTomadorCpf}
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="receipt-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Gerar NFS-e</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Patient Picker Modal */}
      <Modal visible={showPatientPicker} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Paciente</Text>
            <TouchableOpacity onPress={() => setShowPatientPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.patientItem, { borderBottomColor: colors.border }]}
            onPress={() => {
              setPatientId("");
              setPatientName("");
              setTomadorNome("");
              setShowPatientPicker(false);
            }}
          >
            <Text style={[styles.patientItemText, { color: colors.textSecondary }]}>
              Sem paciente
            </Text>
          </TouchableOpacity>
          {isLoadingPatients ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : (
            <ScrollView>
              {patients.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.patientItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setPatientId(p.id);
                    setPatientName(p.name);
                    if (!tomadorNome) setTomadorNome(p.name);
                    setShowPatientPicker(false);
                  }}
                >
                  <Text style={[styles.patientItemText, { color: colors.text }]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMulti: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: "top",
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: { flex: 1, fontSize: 15 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 28,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  patientItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  patientItemText: { fontSize: 15 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardBody: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 0,
  },
  hint: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
});
