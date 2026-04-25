import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";

interface Option {
  label: string;
  value: any;
}

interface OptionSelectorProps {
  label: string;
  value: any | any[];
  options: Option[];
  onSelect: (value: any | any[]) => void;
  placeholder?: string;
  multiple?: boolean;
}

export function OptionSelector({
  label,
  value,
  options,
  onSelect,
  placeholder = "Selecione uma opção",
  multiple = false,
}: OptionSelectorProps) {
  const colors = useColors();
  const { medium } = useHaptics();
  const [showModal, setShowModal] = useState(false);

  const isSelected = (val: any) => {
    if (multiple && Array.isArray(value)) {
      return value.includes(val);
    }
    return value === val;
  };

  const getLabel = () => {
    if (multiple && Array.isArray(value)) {
      if (value.length === 0) return placeholder;
      if (value.length === 1)
        return options.find((o) => o.value === value[0])?.label || placeholder;
      return `${value.length} selecionados`;
    }
    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  const handleSelect = (val: any) => {
    medium();
    if (multiple) {
      const currentValues = Array.isArray(value) ? [...value] : [];
      const index = currentValues.indexOf(val);
      if (index > -1) {
        currentValues.splice(index, 1);
      } else {
        currentValues.push(val);
      }
      onSelect(currentValues);
    } else {
      onSelect(val);
      setShowModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          medium();
          setShowModal(true);
        }}
      >
        <Text
          style={[
            styles.selectorText,
            {
              color: value
                ? Array.isArray(value) && value.length === 0
                  ? colors.textMuted
                  : colors.text
                : colors.textMuted,
            },
          ]}
        >
          {getLabel()}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                {multiple && (
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Text style={{ color: colors.primary, fontWeight: "600" }}>Concluído</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.modalList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[
                    styles.modalItem,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: isSelected(option.value)
                        ? colors.primary + "10"
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      { color: isSelected(option.value) ? colors.primary : colors.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected(option.value) && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalList: {
    paddingVertical: 8,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemText: {
    fontSize: 16,
  },
});
