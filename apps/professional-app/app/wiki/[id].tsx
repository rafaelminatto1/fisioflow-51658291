import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { useWikiPage } from '@/hooks/useWiki';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function WikiPageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { light } = useHaptics();

  const { data: page, isLoading, isError } = useWikiPage(id);

  const handleShare = async () => {
    if (!page) return;
    light();
    await Share.share({ message: `${page.title}\n\n${page.content ?? ''}` });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: page?.title ?? 'Artigo',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={{ marginRight: 8 }}>
              <Ionicons name="share-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : isError || !page ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Artigo não encontrado.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>

          {/* Meta */}
          <View style={styles.meta}>
            {page.category && (
              <View style={[styles.categoryBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.categoryText, { color: colors.primary }]}>{page.category}</Text>
              </View>
            )}
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              Atualizado em {format(new Date(page.updated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
            </Text>
          </View>

          {/* Tags */}
          {page.tags && page.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {page.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.textSecondary }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Content */}
          {page.content ? (
            <Text style={[styles.body, { color: colors.text }]}>{page.content}</Text>
          ) : (
            <View style={styles.emptyContent}>
              <Ionicons name="document-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Este artigo ainda não tem conteúdo.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16 },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  categoryText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  tag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tagText: { fontSize: 12 },
  divider: { height: 1, marginVertical: 16 },
  body: { fontSize: 16, lineHeight: 26 },
  emptyContent: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14 },
});
