import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Patient {
  id: string;
  name: string;
  phone?: string | null;
}

interface SearchablePatientPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (patientId: string) => void;
  patients: Patient[];
  isLoading: boolean;
  selectedId?: string;
}

export function SearchablePatientPicker({
  visible,
  onClose,
  onSelect,
  patients,
  isLoading,
  selectedId,
}: SearchablePatientPickerProps) {
  const colors = useColors();
  const [search, setSearch] = useState('');

  const filteredPatients = useMemo(() => {
    if (!search) return patients;
    const term = search.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.phone?.includes(term)
    );
  }, [patients, search]);

  const renderItem = ({ item }: { item: Patient }) => (
    <TouchableOpacity
      style={[
        styles.item,
        { borderBottomColor: colors.border },
        selectedId === item.id && { backgroundColor: colors.primary + '10' }
      ]}
      onPress={() => {
        onSelect(item.id);
        setSearch('');
        onClose();
      }}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
        {item.phone && (
          <Text style={[styles.itemPhone, { color: colors.textSecondary }]}>{item.phone}</Text>
        )}
      </View>
      {selectedId === item.id && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Selecionar Paciente</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Buscar por nome ou telefone..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <FlatList
              data={filteredPatients}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <Text style={{ color: colors.textSecondary }}>Nenhum paciente encontrado.</Text>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  list: {
    paddingBottom: 40,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  loader: {
    marginTop: 40,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
});
