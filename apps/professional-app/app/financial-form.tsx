import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useCreateFinancialRecord, useUpdateFinancialRecord } from "@/hooks/usePatientFinancial";
import { usePatients } from "@/hooks/usePatients";
import { format } from "date-fns";
import { SearchablePatientPicker } from "@/components/ui/SearchablePatientPicker";

export default function FinancialFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { light, medium, success, error } = useHaptics();

  // Mode: Create or Edit
  const isEditing = !!params.id;
  const recordId = params.id as string;

  // Form State
  const [transactionType, setTransactionType] = useState<"inflow" | "outflow">(
    params.amount && Number(params.amount) < 0 ? "outflow" : "inflow",
  );
  const [patientId, setPatientId] = useState((params.patientId as string) || "");

  // To avoid keyboard issues, we keep the raw numeric string and only format for display
  // We use a dedicated state for the input to avoid unwanted re-renders/blurring
  const initialRawAmount = params.amount ? Math.abs(Number(params.amount)).toString() : "";
  const [rawAmount, setRawAmount] = useState(initialRawAmount);

  const [date, setDate] = useState(params.date ? new Date(params.date as string) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState((params.description as string) || "");
  const [paymentMethod, setPaymentMethod] = useState((params.paymentMethod as string) || "pix");
  const [status, setStatus] = useState<"pending" | "paid">(
    (params.status as "pending" | "paid") || "pending",
  );

  // Pickers State
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showPaymentPicker, setShowPaymentPicker] = useState(false);

  // Hooks
  const { data: patients, isLoading: isLoadingPatients } = usePatients({ status: "active" });
  const createMutation = useCreateFinancialRecord();
  const updateMutation = useUpdateFinancialRecord();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleAmountChange = (text: string) => {
    // Keep only numbers
    const cleaned = text.replace(/\D/g, "");
    setRawAmount(cleaned);
  };

  const displayAmount = useMemo(() => {
    if (!rawAmount) return "";
    const val = parseFloat(rawAmount) / 100;
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }, [rawAmount]);

  const validateForm = () => {
    if (!patientId) {
      Alert.alert("Erro", "Selecione um paciente.");
      return false;
    }
    if (!rawAmount || parseFloat(rawAmount) <= 0) {
      Alert.alert("Erro", "Insira um valor válido.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    light();
    if (!validateForm()) {
      error();
      return;
    }

    medium();
    try {
      let finalAmount = parseFloat(rawAmount) / 100;
      if (transactionType === "outflow") {
        finalAmount = -finalAmount;
      }

      const payload = {
        patient_id: patientId,
        session_date: date.toISOString().split("T")[0], // YYYY-MM-DD
        session_value: finalAmount,
        payment_method: paymentMethod as any,
        payment_status: status,
        notes: description,
        paid_amount: status === "paid" ? finalAmount : 0,
        paid_date: status === "paid" ? new Date().toISOString() : undefined,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          recordId,
          data: {
            ...payload,
            final_value: finalAmount,
          },
        });
        Alert.alert("Sucesso", "Registro atualizado!");
      } else {
        await createMutation.mutateAsync(payload);
        Alert.alert("Sucesso", "Registro criado!");
      }

      success();
      router.back();
    } catch (err) {
      error();
      console.error(err);
      Alert.alert("Erro", "Falha ao salvar registro.");
    }
  };

  const getPatientName = () => {
    const p = patients?.find((p) => p.id === patientId);
    return p ? p.name : "Selecione um paciente";
  };

  const paymentMethods = [
    { label: "Pix", value: "pix" },
    { label: "Cartão de Crédito", value: "credit_card" },
    { label: "Cartão de Débito", value: "debit_card" },
    { label: "Dinheiro", value: "cash" },
    { label: "Transferência", value: "transfer" },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? "Editar Registro" : "Novo Registro"}
          </Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.saveButton, { opacity: isSubmitting ? 0.5 : 1 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Transaction Type Selector (Entrada/Saída) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Tipo de Transação</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  { borderColor: colors.border },
                  transactionType === "inflow" && {
                    backgroundColor: colors.success + "15",
                    borderColor: colors.success,
                  },
                ]}
                onPress={() => {
                  light();
                  setTransactionType("inflow");
                }}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={transactionType === "inflow" ? colors.success : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeText,
                    { color: transactionType === "inflow" ? colors.success : colors.textSecondary },
                  ]}
                >
                  Entrada
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  { borderColor: colors.border },
                  transactionType === "outflow" && {
                    backgroundColor: colors.error + "15",
                    borderColor: colors.error,
                  },
                ]}
                onPress={() => {
                  light();
                  setTransactionType("outflow");
                }}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={transactionType === "outflow" ? colors.error : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeText,
                    { color: transactionType === "outflow" ? colors.error : colors.textSecondary },
                  ]}
                >
                  Saída
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Patient Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Paciente</Text>
            <TouchableOpacity
              style={[
                styles.selector,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => setShowPatientPicker(true)}
            >
              <Text
                style={[styles.selectorText, { color: patientId ? colors.text : colors.textMuted }]}
              >
                {isLoadingPatients ? "Carregando..." : getPatientName()}
              </Text>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Valor</Text>
            <View
              style={[
                styles.amountInputContainer,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>R$</Text>
              <TextInput
                key="amount-input"
                style={[styles.amountInput, { color: colors.text }]}
                value={displayAmount.replace("R$", "").trim()}
                onChangeText={handleAmountChange}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={15}
              />
            </View>
            <Text style={styles.inputHint}>Toque para digitar o valor em centavos</Text>
          </View>

          {/* Date Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Data</Text>
            <TouchableOpacity
              style={[
                styles.selector,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => {
                light();
                setShowDatePicker(true);
              }}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>
                {format(date, "dd/MM/yyyy")}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {Platform.OS === "android" && showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  setShowDatePicker(false);
                  if (selected) setDate(selected);
                }}
              />
            )}
          </View>

          {/* Payment Method */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Forma de Pagamento</Text>
            <TouchableOpacity
              style={[
                styles.selector,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => setShowPaymentPicker(true)}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>
                {paymentMethods.find((m) => m.value === paymentMethod)?.label}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Status */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Status</Text>
            <View style={styles.statusRow}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  { borderColor: colors.border },
                  status === "pending" && {
                    backgroundColor: colors.warning + "20",
                    borderColor: colors.warning,
                  },
                ]}
                onPress={() => setStatus("pending")}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={status === "pending" ? colors.warning : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: status === "pending" ? colors.warning : colors.textSecondary },
                  ]}
                >
                  Pendente
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusOption,
                  { borderColor: colors.border },
                  status === "paid" && {
                    backgroundColor: colors.success + "20",
                    borderColor: colors.success,
                  },
                ]}
                onPress={() => setStatus("paid")}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color={status === "paid" ? colors.success : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: status === "paid" ? colors.success : colors.textSecondary },
                  ]}
                >
                  Pago
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Descrição (Opcional)</Text>
            <TextInput
              key="desc-input"
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  height: 80,
                  textAlignVertical: "top",
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Sessão extra de avaliação"
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS Date Picker Modal */}
      {Platform.OS === "ios" && (
        <Modal visible={showDatePicker} animationType="slide" transparent>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Selecionar Data</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 16 }}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                locale="pt-BR"
                onChange={(_, selected) => {
                  if (selected) setDate(selected);
                }}
                style={{ backgroundColor: colors.surface }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Patient Picker Modal */}
      <SearchablePatientPicker
        visible={showPatientPicker}
        onClose={() => setShowPatientPicker(false)}
        onSelect={(id) => setPatientId(id)}
        patients={patients ?? []}
        isLoading={isLoadingPatients}
        selectedId={patientId}
      />

      {/* Payment Method Picker Modal */}
      <Modal visible={showPaymentPicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPaymentPicker(false)}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: colors.surface }]}>
            {paymentMethods.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={styles.pickerItem}
                onPress={() => {
                  setPaymentMethod(m.value);
                  setShowPaymentPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>{m.label}</Text>
                {paymentMethod === m.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  saveButton: {
    padding: 8,
    marginRight: -8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 52,
  },
  selectorText: {
    fontSize: 16,
  },
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
  },
  typeText: {
    fontWeight: "700",
    fontSize: 14,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
  },
  inputHint: {
    fontSize: 11,
    color: "#94a3b8",
    marginLeft: 4,
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
  },
  statusText: {
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  pickerModalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 8,
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  pickerItemText: {
    fontSize: 16,
  },
});
