import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Input } from '@/components';
import { useColors } from '@/hooks/useColorScheme';
import { usePatients } from '@/hooks/usePatients';
import { useHaptics } from '@/hooks/useHaptics';

interface PatientAutocompleteProps {
  value: string;
  onSelect: (patient: { id: string; name: string; condition?: string }) => void;
  disabled?: boolean;
}

export function PatientAutocomplete({
  value,
  onSelect,
  disabled = false,
}: PatientAutocompleteProps) {
  const colors = useColors();
  const { medium } = useHaptics();
  const [search, setSearch] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: patients = [] } = usePatients({ status: 'active' });

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5);

  return (
    <View style={styles.container}>
      <Input
        placeholder="Digite o nome do paciente..."
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        leftIcon="person-outline"
        rightIcon={search.length > 0 && !disabled ? "close-circle" : undefined}
        onRightIconPress={() => {
          setSearch('');
          setShowSuggestions(true);
        }}
        editable={!disabled}
      />

      {showSuggestions && !disabled && search.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  medium();
                  setSearch(patient.name);
                  setShowSuggestions(false);
                  onSelect({
                    id: patient.id,
                    name: patient.name,
                    condition: (patient as any).main_condition || (patient as any).condition,
                  });
                }}
              >
                <View>
                  <Text style={[styles.suggestionText, { color: colors.text }]}>{patient.name}</Text>
                  <Text style={[styles.suggestionSub, { color: colors.textSecondary }]}>
                    {(patient as any).main_condition || (patient as any).condition || 'Sem condição'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.suggestionItem}>
              <Text style={{ color: colors.textMuted }}>Nenhum paciente encontrado</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    marginBottom: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    fontSize: 16,
  },
  suggestionSub: {
    fontSize: 14,
    marginTop: 2,
  },
});
