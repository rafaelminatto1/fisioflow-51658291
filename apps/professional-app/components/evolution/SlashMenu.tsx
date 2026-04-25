import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: string;
  content: string;
}

const COMMANDS: SlashCommand[] = [
  {
    id: "pain",
    label: "Escala de Dor",
    description: "Relato de dor (0-10)",
    icon: "flame-outline",
    content: "\n• Dor: /10\n• Local: \n• Característica: ",
  },
  {
    id: "exercicios",
    label: "Exercícios",
    description: "Abrir biblioteca de exercícios",
    icon: "fitness-outline",
    content: "", // Handled specially
  },
  {
    id: "procedimentos",
    label: "Procedimentos",
    description: "Inserir procedimentos realizados",
    icon: "medkit-outline",
    content: "", // Handled specially
  },
  {
    id: "testes",
    label: "Testes Clínicos",
    description: "Registrar testes realizados",
    icon: "checkmark-circle-outline",
    content: "", // Handled specially
  },
  {
    id: "objective",
    label: "Objetivos",
    description: "Metas da sessão",
    icon: "flag-outline",
    content: "\n• Objetivos da sessão: ",
  },
  {
    id: "conduct",
    label: "Conduta",
    description: "Procedimentos realizados",
    icon: "clipboard-outline",
    content: "\n• Conduta realizada: ",
  },
  {
    id: "next",
    label: "Próxima Sessão",
    description: "Planejamento futuro",
    icon: "calendar-outline",
    content: "\n• Planejamento próxima sessão: ",
  },
];

interface SlashMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (command: SlashCommand) => void;
  colors: any;
}

export function SlashMenu({ isVisible, onClose, onSelect, colors }: SlashMenuProps) {
  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View
          style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={[styles.header, { color: colors.textSecondary }]}>COMANDOS</Text>
          <FlatList
            data={COMMANDS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => onSelect(item)}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  menu: {
    width: Dimensions.get("window").width * 0.8,
    maxHeight: 400,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  header: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
  },
});
