import React, {  } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Stack, useLocalSearchParams } from "expo-router";
import { toast } from "@/lib/toast";

interface GroupAttendee {
  id: string;
  patient_name: string;
  status: "pending" | "confirmed" | "absent";
  checked_in_at: string | null;
}

export default function GroupSessionScreen() {
  const colors = useColors();
  const { sessionId, groupName } = useLocalSearchParams();
  const queryClient = useQueryClient();

  const { data: attendees = [], isLoading } = useQuery({
    queryKey: ["group-attendees", sessionId],
    queryFn: async () => {
      const res = await fetchApi<{ data: GroupAttendee[] }>(
        `/api/groups/sessions/${sessionId}/attendees`,
      );
      return res.data;
    },
    enabled: !!sessionId,
  });

  const confirmMutation = useMutation({
    mutationFn: async (attendeeId: string) => {
      return fetchApi(`/api/groups/attendees/${attendeeId}/confirm`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-attendees", sessionId] });
      toast.success("Presença confirmada!");
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{ title: (groupName as string) || "Sessão de Grupo", headerLargeTitle: true }}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerInfo}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Lista de Presença</Text>
          <Text style={[styles.count, { color: colors.primary }]}>
            {attendees.length} alunos inscritos
          </Text>
        </View>

        <View style={styles.list}>
          {attendees.map((attendee) => (
            <View
              key={attendee.id}
              style={[styles.attendeeCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.attendeeInfo}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {attendee.patient_name.substring(0, 1)}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.name, { color: colors.text }]}>{attendee.patient_name}</Text>
                  <Text
                    style={[
                      styles.status,
                      {
                        color:
                          attendee.status === "confirmed" ? colors.success : colors.textSecondary,
                      },
                    ]}
                  >
                    {attendee.status === "confirmed"
                      ? `Presente (${new Date(attendee.checked_in_at!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`
                      : "Aguardando check-in"}
                  </Text>
                </View>
              </View>

              {attendee.status !== "confirmed" && (
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                  onPress={() => confirmMutation.mutate(attendee.id)}
                  disabled={confirmMutation.isPending}
                >
                  <Ionicons name="checkmark" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  count: {
    fontSize: 14,
    fontWeight: "800",
  },
  list: { gap: 12 },
  attendeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  attendeeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "black",
  },
  name: {
    fontSize: 15,
    fontWeight: "bold",
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
  },
  confirmButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
