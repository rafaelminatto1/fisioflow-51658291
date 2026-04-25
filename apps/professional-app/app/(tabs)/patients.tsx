import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, SyncStatus, Skeleton } from "@/components";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { usePatients } from "@/hooks/usePatients";
import { useSyncStatus } from "@/hooks/useSyncStatus";

const PatientCard = memo(({ patient, colors, formatDate, light }: any) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={() => {
      light();
      router.push(`/patient/${patient.id}`);
    }}
  >
    <Card style={styles.patientCard}>
      <View style={styles.patientHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {patient.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
            {patient.name}
          </Text>
          {patient.condition ? (
            <View style={[styles.conditionBadge, { backgroundColor: colors.surfaceHover }]}>
              <Text
                style={[styles.patientCondition, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {patient.condition}
              </Text>
            </View>
          ) : (
            <Text style={[styles.patientConditionMuted, { color: colors.textMuted }]}>
              Sem condição registrada
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>

      <View style={[styles.patientFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Desde {formatDate(patient.createdAt)}
          </Text>
        </View>
        {patient.phone && (
          <View style={styles.footerItem}>
            <Ionicons name="call-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {patient.phone}
            </Text>
          </View>
        )}
      </View>
    </Card>
  </TouchableOpacity>
));

function PatientSkeletonCard() {
  return (
    <Card style={styles.patientCard}>
      <View style={styles.patientHeader}>
        <Skeleton width={48} height={48} variant="circular" />
        <View style={styles.patientInfo}>
          <Skeleton width="70%" height={16} variant="text" />
          <Skeleton width="45%" height={12} variant="text" style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={[styles.patientFooter, { borderTopColor: "transparent" }]}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Skeleton width={100} height={12} variant="text" />
          <Skeleton width={90} height={12} variant="text" />
        </View>
      </View>
    </Card>
  );
}

function PatientListSkeleton() {
  return (
    <View style={styles.listContainer}>
      {[1, 2, 3, 4, 5].map((i) => (
        <PatientSkeletonCard key={i} />
      ))}
    </View>
  );
}

export default function PatientsScreen() {
  const colors = useColors();
  const { data: patients, isLoading, refetch } = usePatients({ status: "active" });
  const { status: syncStatus, isOnline, setSyncing, setSynced } = useSyncStatus();
  const { light } = useHaptics();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setSyncing();
    light();
    await refetch();
    setSynced();
    setRefreshing(false);
  }, [refetch, setSyncing, setSynced, light]);

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.condition?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q),
    );
  }, [patients, searchQuery]);

  const formatDate = useCallback((date: Date | string | undefined) => {
    if (!date) return "N/A";
    try {
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return "N/A";
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    } catch {
      return "N/A";
    }
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar paciente…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                light();
                setSearchQuery("");
              }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            light();
            router.push("/patient-form");
          }}
          accessibilityLabel="Novo paciente"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.statsRow}>
          {!isLoading && (
            <>
              <View style={[styles.statBadge, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.statBadgeText, { color: colors.success }]}>
                  {patients.length} cadastrados
                </Text>
              </View>
              {searchQuery.trim() !== "" && (
                <View style={[styles.statBadge, { backgroundColor: colors.primaryLight + "40" }]}>
                  <Text style={[styles.statBadgeText, { color: colors.primary }]}>
                    {filteredPatients.length} encontrados
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
        <SyncStatus status={syncStatus} isOnline={isOnline} compact />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && !refreshing ? (
          <PatientListSkeleton />
        ) : filteredPatients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.border }]}>
              <Ionicons
                name={searchQuery.trim() ? "search-outline" : "people-outline"}
                size={32}
                color={colors.textMuted}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {searchQuery.trim() ? "Sem resultados" : "Sem pacientes"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery.trim()
                ? "Tente buscar com outro termo ou limpe o filtro."
                : "Você ainda não possui pacientes cadastrados. Toque em + para adicionar."}
            </Text>
            {!searchQuery.trim() && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  light();
                  router.push("/patient-form");
                }}
              >
                <Text style={styles.emptyBtnText}>Adicionar paciente</Text>
              </TouchableOpacity>
            )}
          </Card>
        ) : (
          <View style={styles.listContainer}>
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                colors={colors}
                formatDate={formatDate}
                light={light}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  statsRow: { flexDirection: "row", gap: 6 },
  statBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statBadgeText: { fontSize: 11, fontWeight: "600" },
  scrollContent: { padding: 14, paddingTop: 4, paddingBottom: 48 },
  listContainer: { gap: 10 },
  patientCard: { borderRadius: 14 },
  patientHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  conditionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  patientCondition: { fontSize: 11, fontWeight: "500" },
  patientConditionMuted: { fontSize: 12 },
  patientFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerText: { fontSize: 11, fontWeight: "500" },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
    borderRadius: 14,
    borderStyle: "dashed",
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
