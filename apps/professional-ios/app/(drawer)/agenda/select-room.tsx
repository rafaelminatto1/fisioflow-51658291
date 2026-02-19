import { useState, useCallback } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/hooks/useTheme';
import { HapticFeedback } from '@/lib/haptics';

// Available rooms in the clinic
const CLINIC_ROOMS = [
  { id: 'sala-01', name: 'Sala 1', capacity: 1, equipment: 'Mesa, Cadeira' },
  { id: 'sala-02', name: 'Sala 2', capacity: 1, equipment: 'Mesa, Cadeira, Barras' },
  { id: 'sala-03', name: 'Sala 3', capacity: 2, equipment: 'Mesa, 2 Cadeiras' },
  { id: 'sala-04', name: 'Sala 4', capacity: 1, equipment: 'Mesa de tração, Cadeira' },
  { id: 'sala-05', name: 'Sala 5', capacity: 1, equipment: 'Maca, Barras paralelas' },
  { id: 'sala-06', name: 'Sala 6', capacity: 1, equipment: 'Bola suíça, Colchonete' },
];

export default function SelectRoomScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRooms = CLINIC_ROOMS.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.equipment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRoom = useCallback((roomId: string) => {
    HapticFeedback.selection();
    setSelectedRoom(roomId);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedRoom) return;

    HapticFeedback.medium();
    const room = CLINIC_ROOMS.find(r => r.id === selectedRoom);

    // Save the selected room to AsyncStorage
    await AsyncStorage.setItem('@selected_room', selectedRoom);

    // Navigate back
    router.back();
  }, [selectedRoom, router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Icon name="x" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Selecionar Sala
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Buscar sala..."
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

      {/* Room List */}
      <ScrollView style={styles.scrollView}>
        {filteredRooms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="door-open" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma sala encontrada
            </Text>
          </View>
        ) : (
          filteredRooms.map((room) => {
            const isSelected = selectedRoom === room.id;
            return (
              <Pressable
                key={room.id}
                onPress={() => handleSelectRoom(room.id)}
                style={({ pressed }) => [
                  styles.roomItem,
                  {
                    backgroundColor: isSelected ? `${colors.primary}15` : colors.card,
                    opacity: pressed ? 0.8 : 1,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.roomInfo}>
                  <View style={styles.roomHeader}>
                    <Text style={[styles.roomName, { color: colors.text }]}>
                      {room.name}
                    </Text>
                    <View style={[
                      styles.capacityBadge,
                      { backgroundColor: `${colors.primary}20` }
                    ]}>
                      <Icon name="users" size={14} color={colors.primary} />
                      <Text style={[styles.capacityText, { color: colors.primary }]}>
                        {room.capacity}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.roomDetails}>
                    <Icon name="package" size={16} color={colors.textSecondary} />
                    <Text style={[styles.equipmentText, { color: colors.textSecondary }]}>
                      {room.equipment}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radioButton, {
                  borderColor: isSelected ? colors.primary : colors.border
                }]}>
                  {isSelected && (
                    <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </Pressable>
            );
          })
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <Text style={[styles.selectedInfo, { color: colors.textSecondary }]}>
          {selectedRoom
            ? `Sala ${CLINIC_ROOMS.find(r => r.id === selectedRoom)?.name} selecionada`
            : 'Selecione uma sala'
          }
        </Text>
        <Button
          variant="primary"
          onPress={handleConfirm}
          disabled={!selectedRoom}
        >
          Confirmar
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
    gap: 8,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
  },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roomDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipmentText: {
    fontSize: 13,
    flex: 1,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  selectedInfo: {
    fontSize: 14,
    flex: 1,
    marginRight: 16,
  },
});
