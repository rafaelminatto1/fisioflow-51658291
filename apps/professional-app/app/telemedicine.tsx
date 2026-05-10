import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useTelemedicine } from "@/hooks/useTelemedicine";
import { usePatients } from "@/hooks/usePatients";
import { ApiTelemedicineRoom } from "@/lib/api";
import { SearchablePatientPicker } from "@/components/ui/SearchablePatientPicker";

const STATUS_LABELS: Record<ApiTelemedicineRoom["status"], string> = {
  waiting: "Aguardando",
  active: "Em andamento",
  ended: "Encerrado",
};

const RoomCard = ({
  room,
  colors,
  light,
  onStart,
}: {
  room: ApiTelemedicineRoom;
  colors: any;
  light: () => void;
  onStart: (id: string) => void;
}) => {
  const statusColors: Record<ApiTelemedicineRoom["status"], string> = {
    waiting: colors.warning,
    active: colors.success,
    ended: colors.textMuted,
  };

  const handleEnter = () => {
    light();
    if (room.status === "waiting") {
      onStart(room.id);
    } else if (typeof room.meeting_url === "string") {
      Linking.openURL(room.meeting_url);
    }
  };

  return (
    <Card style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <View style={[styles.roomIcon, { backgroundColor: colors.primary + "10" }]}>
          <Ionicons name="videocam" size={24} color={colors.primary} />
        </View>
        <View style={styles.roomInfo}>
          <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
            {room.patient_name || "Paciente"}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[room.status] }]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {STATUS_LABELS[room.status]}
            </Text>
          </View>
        </View>
        {room.status !== "ended" && (
          <TouchableOpacity
            style={[styles.enterButton, { backgroundColor: colors.primary }]}
            onPress={handleEnter}
          >
            <Text style={styles.enterButtonText}>
              {room.status === "waiting" ? "Iniciar" : "Entrar"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
};

export default function TelemedicineScreen() {
  const colors = useColors();
  const { rooms, loading, refreshing, refresh, createRoom, startRoom } = useTelemedicine();
  const { data: patients = [], isLoading: loadingPatients } = usePatients({ status: "active" });
  const { light, medium } = useHaptics();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSelectPatient = async (patientId: string) => {
    setPickerVisible(false);
    setCreating(true);
    try {
      const room = await createRoom(patientId);
      if (typeof room.meeting_url === "string") Linking.openURL(room.meeting_url);
    } catch {
      Alert.alert("Erro", "Não foi possível criar a sala.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Telemedicina</Text>
        <TouchableOpacity
          onPress={() => { medium(); setPickerVisible(true); }}
          style={styles.addButton}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="add" size={28} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : rooms.length > 0 ? (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              colors={colors}
              light={light}
              onStart={async (id) => {
                const updated = await startRoom(id);
                if (typeof updated.meeting_url === "string") Linking.openURL(updated.meeting_url);
              }}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma consulta online agendada.
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={() => { medium(); setPickerVisible(true); }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Nova Teleconsulta</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SearchablePatientPicker
        visible={pickerVisible}
        patients={patients}
        isLoading={loadingPatients}
        onSelect={handleSelectPatient}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "bold" },
  addButton: { padding: 4, width: 36, alignItems: "center" },
  content: { flex: 1, padding: 16 },
  loader: { marginTop: 40 },
  roomCard: { padding: 16, marginBottom: 12 },
  roomHeader: { flexDirection: "row", alignItems: "center" },
  roomIcon: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: "center", alignItems: "center",
  },
  roomInfo: { flex: 1, marginLeft: 12 },
  patientName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12 },
  enterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  enterButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 80 },
  emptyText: { fontSize: 16, marginTop: 16, textAlign: "center", marginBottom: 24 },
  createButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});
