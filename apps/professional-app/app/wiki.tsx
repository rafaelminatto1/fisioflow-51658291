import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { useWikiPages } from "@/hooks/useWiki";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WikiScreen() {
  const colors = useColors();
  const { light } = useHaptics();
  const [search, setSearch] = useState("");

  const {
    data: pages = [],
    isLoading,
    refetch,
    isRefetching,
  } = useWikiPages(search.length >= 2 ? { search } : undefined);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <Stack.Screen
        options={{
          title: "Base de Conhecimento",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Search */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar artigos..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : pages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search ? "Nenhum resultado" : "Nenhum artigo ainda"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {search
                ? "Tente um termo diferente."
                : "Crie artigos no painel web para acessá-los aqui."}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {pages.map((page) => (
              <TouchableOpacity
                key={page.id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  light();
                  router.push({ pathname: "/wiki/[id]", params: { id: page.id } });
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                      {page.title}
                    </Text>
                    {page.category && (
                      <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
                        {page.category}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>

                <View style={styles.cardFooter}>
                  {page.tags && page.tags.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.tagsRow}
                    >
                      {page.tags.slice(0, 3).map((tag) => (
                        <View
                          key={tag}
                          style={[styles.tag, { backgroundColor: colors.primaryLight }]}
                        >
                          <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                  <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                    {format(new Date(page.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 15 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyDesc: { fontSize: 14, textAlign: "center" },
  list: { gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  cardCategory: { fontSize: 12, marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tagsRow: { flexGrow: 0 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6 },
  tagText: { fontSize: 11, fontWeight: "600" },
  cardDate: { fontSize: 11 },
});
