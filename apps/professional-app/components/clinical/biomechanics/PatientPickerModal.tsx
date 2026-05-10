import React, { useState } from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Modal } from "../Modal";
import { useColors } from "@/hooks/useColorScheme";

interface Patient {
  id: string;
  name: string;
  cpf?: string;
}

interface PatientPickerModalProps {
  visible: boolean;
  onClose: () => void;
  patients: Patient[];
  onSelect: (patient: Patient) => void;
}

export const PatientPickerModal: React.FC<PatientPickerModalProps> = ({
  visible,
  onClose,
  patients,
  onSelect,
}) => {
  const colors = useColors();
  const [search, setSearch] = useState("");

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.cpf && p.cpf.includes(search))
  );

  return (
    <Modal visible={visible} onClose={onClose} title="Selecionar Paciente">
      <View style={styles.container}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder="Buscar por nome ou CPF..."
            style={[styles.input, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.patientItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <View style={styles.patientInfo}>
                <Text style={[styles.patientName, { color: colors.text }]}>{item.name}</Text>
                {item.cpf && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.cpf}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          style={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.textSecondary }}>Nenhum paciente encontrado</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 16,
    height: 44,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  patientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: "500",
  },
  empty: {
    alignItems: "center",
    marginTop: 40,
  }
});
