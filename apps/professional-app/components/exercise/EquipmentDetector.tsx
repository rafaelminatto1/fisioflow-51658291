import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Image } from "react-native";
import { Dumbbell, Scan, CheckCircle2 } from "lucide-react-native";

export interface DetectedEquipment {
  id: string;
  name: string;
  confidence: number;
  recommendedExercises: string[];
}

export interface EquipmentDetectorProps {
  onSelectExercises?: (exercises: string[]) => void;
}

export const EquipmentDetector: React.FC<EquipmentDetectorProps> = ({
  onSelectExercises,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedEquipment[]>([]);

  const handleScan = () => {
    setIsScanning(true);
    // Simula detecção visual de equipamento (YOLOv8-nano / CoreML)
    setTimeout(() => {
      setDetectedItems([
        {
          id: "eq1",
          name: "Faixa Elástica (Theraband Amarela)",
          confidence: 0.94,
          recommendedExercises: ["Rotação Externa de Ombro", "Abdução de Quadril em Pé"],
        },
        {
          id: "eq2",
          name: "Bola Suíça (65cm)",
          confidence: 0.89,
          recommendedExercises: ["Ponte Pélvica com Apoio dos Pés", "Prancha com Antebraço na Bola"],
        },
      ]);
      setIsScanning(false);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Dumbbell size={18} color="#2dd4bf" />
        <Text style={styles.title}>Detecção Automática de Equipamento</Text>
      </View>

      {detectedItems.length === 0 ? (
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={handleScan}
          disabled={isScanning}
        >
          <Scan size={18} color="#0f172a" />
          <Text style={styles.scanBtnText}>
            {isScanning ? "Escaneando com Vision AI..." : "Escanear Equipamentos da Sala"}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>Equipamentos Detectados na Câmera:</Text>
          {detectedItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.confidenceText}>{(item.confidence * 100).toFixed(0)}% precisão</Text>
              </View>

              <Text style={styles.recTitle}>Exercícios Recomendados:</Text>
              {item.recommendedExercises.map((ex, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.exerciseChip}
                  onPress={() => onSelectExercises?.([ex])}
                >
                  <CheckCircle2 size={12} color="#34d399" />
                  <Text style={styles.exerciseChipText}>{ex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f8fafc",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2dd4bf",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  scanBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  resultsContainer: {
    gap: 8,
  },
  resultsHeader: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: "#020617",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 6,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "between",
    alignItems: "center",
  },
  itemName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38bdf8",
    flex: 1,
  },
  confidenceText: {
    fontSize: 10,
    color: "#34d399",
    fontWeight: "600",
  },
  recTitle: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  exerciseChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: "flex-start",
  },
  exerciseChipText: {
    fontSize: 11,
    color: "#34d399",
    fontWeight: "500",
  },
});
