import { useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { query, collection, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Exercise } from '@/types';

export default function SelectExerciseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();

  const multiple = params.multiple === 'true';
  const selectedIds = params.selected?.split(',').filter(Boolean) || [];

  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [searchQuery, setSearchQuery] = useState('');

  const loadExercises = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'exercises'),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      const items: Exercise[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Exercise);
      });
      setExercises(items);
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load exercises on mount
  useState(() => {
    loadExercises();
  });

  const filteredExercises = exercises.filter(exercise =>
    exercise.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exercise.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelection = useCallback((id: string) => {
    HapticFeedback.light();
    if (multiple) {
      setSelected(prev =>
        prev.includes(id)
          ? prev.filter(x => x !== id)
          : [...prev, id]
      );
    } else {
      // Single selection - return immediately
      router.setParams({ selected: id });
    }
  }, [multiple, router]);

  const handleConfirm = useCallback(() => {
    HapticFeedback.medium();
    // Return selected exercises via router params or state
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Selecionar Exercício{multiple ? 's' : ''}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar exercício..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Icon name="x-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Exercise List */}
      <ScrollView style={styles.scrollView}>
        {filteredExercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="dumbbell" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'Nenhum exercício encontrado' : 'Nenhum exercício cadastrado'}
            </Text>
          </View>
        ) : (
          filteredExercises.map((exercise) => {
            const isSelected = selected.includes(exercise.id);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => toggleSelection(exercise.id)}
                style={({ pressed }) => [
                  styles.exerciseItem,
                  {
                    backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: colors.text }]}>
                    {exercise.name}
                  </Text>
                  {exercise.category && (
                    <Badge variant="outline" size="sm">
                      {exercise.category}
                    </Badge>
                  )}
                </View>
                <View style={[styles.checkbox, {
                  backgroundColor: isSelected ? colors.primary : colors.border,
                  borderColor: isSelected ? colors.primary : colors.border
                }]}>
                  {isSelected && (
                    <Icon name="check" size={16} color="#fff" />
                  )}
                </View>
              </Pressable>
            );
          })
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Confirm Button */}
      {multiple && (
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>
            {selected.length} exercício{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}
          </Text>
          <Button
            variant="primary"
            onPress={handleConfirm}
            disabled={selected.length === 0}
          >
            Confirmar
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
    gap: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
  bottomSpacing: {
    height: 80,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  selectedCount: {
    fontSize: 14,
  },
});
