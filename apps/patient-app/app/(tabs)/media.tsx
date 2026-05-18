import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Modal,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useColors } from "@/hooks/useColorScheme";
import { Spacing } from "@/constants/spacing";
import { patientMediaApi } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_PADDING = Spacing.screen;
const PHOTO_COL_GAP = 4;
const PHOTO_SIZE = (SCREEN_WIDTH - SCREEN_PADDING * 2 - PHOTO_COL_GAP * 2) / 3;

const PHOTO_TYPE_LABELS: Record<string, string> = {
  antes: "Antes",
  depois: "Depois",
  postural: "Postural",
  cicatriz: "Cicatriz",
  ferida: "Ferida",
  outro: "Outro",
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  scheduled: "Agendado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  scheduled: "#3B82F6",
  completed: "#10B981",
  cancelled: "#EF4444",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  exame_sangue: "Exame de Sangue",
  raio_x: "Raio-X",
  ressonancia: "Ressonância",
  ultrassom: "Ultrassom",
  tomografia: "Tomografia",
  fisioterapia: "Fisioterapia",
  consulta: "Consulta",
  outro: "Outro",
};

type PhotoItem = {
  id: string;
  r2_key: string;
  thumbnail_url: string | null;
  photo_type: string;
  body_region: string | null;
  notes: string | null;
  taken_at: string | null;
  created_at: string;
};

type MedicalRequest = {
  id: string;
  request_type: string;
  title: string | null;
  requested_by: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  status: string;
  notes: string | null;
  file_r2_key: string | null;
  created_at: string;
};

type Section = "photos" | "requests";

export default function MediaScreen() {
  const colors = useColors();
  const _queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<Section>("photos");
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [photoAccessUrl, setPhotoAccessUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  const {
    data: photos = [],
    isLoading: loadingPhotos,
    refetch: refetchPhotos,
  } = useQuery({
    queryKey: ["patient-portal", "media", "photos"],
    queryFn: () => patientMediaApi.getPhotos(),
  });

  const {
    data: requests = [],
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["patient-portal", "media", "requests"],
    queryFn: () => patientMediaApi.getMedicalRequests(),
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchPhotos(), refetchRequests()]);
  }, [refetchPhotos, refetchRequests]);

  const openPhoto = async (photo: PhotoItem) => {
    setSelectedPhoto(photo);
    setPhotoAccessUrl(photo.thumbnail_url ?? null);
    if (photo.r2_key) {
      setLoadingUrl(true);
      try {
        const res = await patientMediaApi.getAccessUrl(photo.r2_key);
        setPhotoAccessUrl(res.url);
      } catch {
        // Fallback to thumbnail
      } finally {
        setLoadingUrl(false);
      }
    }
  };

  const openDocument = async (r2Key: string) => {
    try {
      const res = await patientMediaApi.getAccessUrl(r2Key);
      await Linking.openURL(res.url);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o documento.");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return "";
    }
  };

  const isLoading = loadingPhotos || loadingRequests;
  const isEmpty = activeSection === "photos" ? photos.length === 0 : requests.length === 0;

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Minha Mídia</Text>
      </View>

      {/* Section Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["photos", "requests"] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.tabItem,
              activeSection === s && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveSection(s)}
          >
            <Ionicons
              name={s === "photos" ? "images-outline" : "document-text-outline"}
              size={18}
              color={activeSection === s ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeSection === s ? colors.primary : colors.textMuted },
              ]}
            >
              {s === "photos" ? `Fotos (${photos.length})` : `Pedidos (${requests.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isEmpty ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
          contentContainerStyle={styles.centered}
        >
          <Ionicons
            name={activeSection === "photos" ? "images-outline" : "document-text-outline"}
            size={56}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {activeSection === "photos"
              ? "Nenhuma foto registrada"
              : "Nenhum pedido médico registrado"}
          </Text>
          <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
            {activeSection === "photos"
              ? "Seu fisioterapeuta adicionará fotos de evolução aqui"
              : "Seus pedidos de exames e consultas aparecerão aqui"}
          </Text>
        </ScrollView>
      ) : activeSection === "photos" ? (
        <FlatList
          data={photos as PhotoItem[]}
          keyExtractor={(item) => item.id}
          numColumns={3}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
          contentContainerStyle={styles.photoGrid}
          columnWrapperStyle={styles.photoRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.photoThumb, { backgroundColor: colors.surface }]}
              onPress={() => openPhoto(item)}
            >
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={styles.photoImage} />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                </View>
              )}
              {item.photo_type && item.photo_type !== "outro" && (
                <View style={[styles.photoBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.photoBadgeText}>
                    {PHOTO_TYPE_LABELS[item.photo_type] ?? item.photo_type}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        >
          {(requests as MedicalRequest[]).map((req) => (
            <View
              key={req.id}
              style={[
                styles.requestCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestTitleRow}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={1}>
                    {req.title || REQUEST_TYPE_LABELS[req.request_type] || req.request_type}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: REQUEST_STATUS_COLORS[req.status] + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: REQUEST_STATUS_COLORS[req.status] ?? colors.textSecondary },
                    ]}
                  >
                    {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                  </Text>
                </View>
              </View>

              {req.requested_by && (
                <Text style={[styles.requestMeta, { color: colors.textSecondary }]}>
                  Solicitado por {req.requested_by}
                </Text>
              )}

              <View style={styles.requestDates}>
                <Text style={[styles.requestMeta, { color: colors.textMuted }]}>
                  Criado em {formatDate(req.created_at)}
                </Text>
                {req.scheduled_date && (
                  <Text style={[styles.requestMeta, { color: colors.textMuted }]}>
                    · Agendado: {formatDate(req.scheduled_date)}
                  </Text>
                )}
                {req.completed_date && (
                  <Text style={[styles.requestMeta, { color: colors.success }]}>
                    · Concluído: {formatDate(req.completed_date)}
                  </Text>
                )}
              </View>

              {req.notes && (
                <Text
                  style={[styles.requestNotes, { color: colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {req.notes}
                </Text>
              )}

              {req.file_r2_key && (
                <TouchableOpacity
                  style={[styles.downloadBtn, { borderColor: colors.primary }]}
                  onPress={() => openDocument(req.file_r2_key!)}
                >
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                  <Text style={[styles.downloadText, { color: colors.primary }]}>
                    Ver documento
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Photo lightbox modal */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {loadingUrl ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : photoAccessUrl ? (
            <Image
              source={{ uri: photoAccessUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.centered}>
              <Ionicons name="image-outline" size={56} color="#fff" />
            </View>
          )}

          {selectedPhoto && (
            <View style={styles.modalMeta}>
              <Text style={styles.modalMetaText}>
                {PHOTO_TYPE_LABELS[selectedPhoto.photo_type] ?? selectedPhoto.photo_type}
                {selectedPhoto.body_region ? ` · ${selectedPhoto.body_region}` : ""}
                {selectedPhoto.taken_at ? ` · ${formatDate(selectedPhoto.taken_at)}` : ""}
              </Text>
              {selectedPhoto.notes && <Text style={styles.modalNotes}>{selectedPhoto.notes}</Text>}
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(_colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: SCREEN_PADDING,
      paddingTop: 12,
      paddingBottom: 8,
    },
    title: { fontSize: 22, fontWeight: "700" },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      marginHorizontal: SCREEN_PADDING,
    },
    tabItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      marginBottom: -1,
    },
    tabLabel: { fontSize: 14, fontWeight: "500" },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SCREEN_PADDING,
      gap: 8,
    },
    emptyText: { fontSize: 16, fontWeight: "600", textAlign: "center", marginTop: 12 },
    emptySubText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    photoGrid: { padding: SCREEN_PADDING },
    photoRow: { gap: PHOTO_COL_GAP, marginBottom: PHOTO_COL_GAP },
    photoThumb: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE,
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
    },
    photoImage: { width: "100%", height: "100%" },
    photoPlaceholder: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    photoBadge: {
      position: "absolute",
      bottom: 4,
      left: 4,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    photoBadgeText: { color: "#fff", fontSize: 9, fontWeight: "600" },
    listContent: { padding: SCREEN_PADDING, gap: 12 },
    requestCard: {
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      gap: 6,
    },
    requestHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    requestTitleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    requestTitle: { flex: 1, fontSize: 15, fontWeight: "600" },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 12, fontWeight: "500" },
    requestMeta: { fontSize: 13 },
    requestDates: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
    requestNotes: { fontSize: 13, lineHeight: 18 },
    downloadBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    downloadText: { fontSize: 14, fontWeight: "500" },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.92)",
      alignItems: "center",
      justifyContent: "center",
    },
    modalClose: {
      position: "absolute",
      top: 52,
      right: 20,
      zIndex: 10,
      padding: 8,
    },
    modalImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.3, maxHeight: "70%" },
    modalMeta: {
      position: "absolute",
      bottom: 40,
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: SCREEN_PADDING,
      gap: 4,
    },
    modalMetaText: { color: "#fff", fontSize: 14, fontWeight: "500", textAlign: "center" },
    modalNotes: { color: "rgba(255,255,255,0.75)", fontSize: 13, textAlign: "center" },
  });
}
