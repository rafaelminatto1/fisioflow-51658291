import React from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { User, ChevronRight, Video, Image as ImageIcon, Activity } from "lucide-react-native";
import { ANALYSIS_TYPES, AnalysisType, AnalysisMode } from "../../../types/biomechanics";
import { useColors } from "../../../hooks/useColorScheme";
import { Card } from "../../Card";

interface BiomechanicsHomeViewProps {
  selectedPatient: any;
  onSelectPatient: () => void;
  onStartAnalysis: (type: AnalysisType, mode: AnalysisMode) => void;
}

export const BiomechanicsHomeView: React.FC<BiomechanicsHomeViewProps> = ({
  selectedPatient,
  onSelectPatient,
  onStartAnalysis,
}) => {
  const colors = useColors();
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Seção do Paciente */}
      <TouchableOpacity style={styles.patientCard} onPress={onSelectPatient}>
        <View style={styles.patientInfo}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + "15" }]}>
            <User size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.patientName, { color: colors.text }]}>
              {selectedPatient ? selectedPatient.name : "Selecionar Paciente"}
            </Text>
            <Text style={[styles.patientSub, { color: colors.textSecondary }]}>
              {selectedPatient ? "Paciente selecionado" : "Toque para escolher da lista"}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Análise Biomecânica</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Selecione o tipo de avaliação para iniciar</Text>

      <View style={styles.grid}>
        {ANALYSIS_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.typeCard, { backgroundColor: colors.surface }]}
            onPress={() => onStartAnalysis(type.id, "live")}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + "10" }]}>
              <Activity size={28} color={colors.primary} />
            </View>
            <Text style={[styles.typeLabel, { color: colors.text }]}>{type.label}</Text>
            <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>{type.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.optionsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Outras Opções</Text>
        <View style={styles.optionRow}>
          <TouchableOpacity 
            style={[styles.secondaryOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onStartAnalysis("postura", "video")}
          >
            <Video size={20} color={colors.textSecondary} />
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>Analisar Vídeo</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryOption, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => onStartAnalysis("postura", "photo")}
          >
            <ImageIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.optionText, { color: colors.textSecondary }]}>Analisar Foto</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  patientInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e0e7ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
  },
  patientSub: {
    fontSize: 12,
    color: "#64748b",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  typeCard: {
    width: "47%",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#eef2ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  typeDesc: {
    fontSize: 11,
    color: "#94a3b8",
    lineHeight: 14,
  },
  optionsSection: {
    marginTop: 20,
  },
  optionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  secondaryOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
});
