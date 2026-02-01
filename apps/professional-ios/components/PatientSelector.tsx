import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePatients } from '@/hooks/usePatients';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';
import { getInitials } from '@/lib/utils';

export interface PatientSelectorProps {
  selected: { id: string; name: string } | null;
  onSelect: (patient: { id: string; name: string }) => void;
  error?: string;
}

export function PatientSelector({ selected, onSelect, error }: PatientSelectorProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: patients, isLoading } = usePatients();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const filteredPatients = patients?.filter(p =>
    !debouncedSearch ||
    p.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) || [];

  const handleSelect = (patient: { id: string; name: string }) => {
    HapticFeedback.selection();
    onSelect(patient);
  };

  return (
    <>
      <Pressable
        onPress={() => router.push('/patients/select')}
        style={({ pressed }) => [
          styles.selector,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.error : colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {selected ? (
          <View style={styles.selectedContent}>
            <Avatar
              name={selected.name}
              size={40}
            />
            <Text style={[styles.selectedText, { color: colors.text }]}>{selected.name}</Text>
          </View>
        ) : (
          <View style={styles.placeholderContent}>
            <Icon name="user-plus" size={20} color={colors.textSecondary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Selecionar paciente
            </Text>
          </View>
        )}
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      </Pressable>

      {/* Quick Search Dropdown */}
      {search.length > 0 && (
        <Card style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : filteredPatients.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum paciente encontrado
              </Text>
            ) : (
              filteredPatients.slice(0, 5).map((patient) => (
                <Pressable
                  key={patient.id}
                  onPress={() => {
                    handleSelect({ id: patient.id, name: patient.name || '' });
                    setSearch('');
                  }}
                  style={({ pressed }) => [
                    styles.patientItem,
                    { backgroundColor: pressed ? `${colors.primary}10` : 'transparent' },
                  ]}
                >
                  <Avatar name={patient.name || ''} size={32} />
                  <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                    {patient.name}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </Card>
      )}

      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedText: {
    fontSize: 15,
    fontWeight: '500',
  },
  placeholderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 15,
  },
  dropdown: {
    marginTop: 8,
    padding: 8,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  patientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  patientName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
});
