import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { Button } from "@/components";
import { Modal } from "@/components/Modal";

interface DeleteConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  recordInfo?: {
    patientName: string;
    amount: number;
    date: string;
  };
}

export function DeleteConfirmationModal({
  visible,
  onClose,
  onConfirm,
  recordInfo,
}: DeleteConfirmationModalProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} onClose={onClose} title="Excluir Registro">
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Tem certeza?</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Esta ação não pode ser desfeita.
        </Text>

        {recordInfo && (
          <View
            style={[
              styles.recordInfo,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Paciente:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {recordInfo.patientName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Valor:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                R$ {recordInfo.amount.toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Data:</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recordInfo.date}</Text>
            </View>
          </View>
        )}

        <View style={styles.buttons}>
          <Button
            title="Cancelar"
            onPress={onClose}
            variant="outline"
            size="lg"
            style={styles.button}
          />
          <Button
            title="Excluir"
            onPress={onConfirm}
            variant="secondary"
            size="lg"
            leftIcon="trash-outline"
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  recordInfo: {
    width: "100%",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
  },
});
