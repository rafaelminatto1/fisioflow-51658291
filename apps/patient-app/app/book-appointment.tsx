import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColorScheme";
import { Card, Button } from "@/components";
import { Spacing } from "@/constants/spacing";
import { format, addDays, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { patientPortalApi } from "@/api/v2/patientPortal";

type Therapist = {
  id: string;
  name: string;
  email: string | null;
  role: string;
};

export default function BookAppointmentScreen() {
  const colors = useColors();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoadingTherapists, setIsLoadingTherapists] = useState(true);

  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  
  // Dates for step 2
  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  
  const [isBooking, setIsBooking] = useState(false);

  // Generate next 14 days
  const dates = Array.from({ length: 14 }).map((_, i) => addDays(today, i));

  useEffect(() => {
    async function fetchTherapists() {
      try {
        const data = await patientPortalApi.getTherapists();
        setTherapists(data);
        if (data.length === 1) {
          setSelectedTherapist(data[0]);
          setStep(2);
        }
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar os profissionais.");
      } finally {
        setIsLoadingTherapists(false);
      }
    }
    fetchTherapists();
  }, []);

  useEffect(() => {
    if (step === 2 && selectedTherapist) {
      fetchSlots(selectedTherapist.id, selectedDate);
    }
  }, [step, selectedDate, selectedTherapist]);

  const fetchSlots = async (therapistId: string, date: Date) => {
    setIsLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const slots = await patientPortalApi.getAvailableSlots(therapistId, dateStr);
      setAvailableSlots(slots);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os horários.");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!selectedTherapist || !selectedSlot) return;

    setIsBooking(true);
    try {
      await patientPortalApi.bookAppointment({
        therapist_id: selectedTherapist.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        time: selectedSlot,
        type: "session",
      });
      
      Alert.alert("Sucesso", "Consulta agendada com sucesso!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível realizar o agendamento. Tente novamente.");
    } finally {
      setIsBooking(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => {
        if (step === 2 && therapists.length > 1) {
          setStep(1);
        } else {
          router.back();
        }
      }} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Novo Agendamento</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (isLoadingTherapists) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.content}>
        {step === 1 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Selecione o Profissional</Text>
            {therapists.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum profissional disponível.
              </Text>
            ) : (
              therapists.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.therapistCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedTherapist?.id === t.id && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => {
                    setSelectedTherapist(t);
                    setStep(2);
                  }}
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {t.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.therapistInfo}>
                    <Text style={[styles.therapistName, { color: colors.text }]}>{t.name}</Text>
                    <Text style={[styles.therapistRole, { color: colors.textSecondary }]}>Fisioterapeuta</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <View style={styles.selectedTherapistHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Selecione a Data</Text>
              {therapists.length > 1 && (
                <Text style={[styles.selectedTherapistName, { color: colors.primary }]}>
                  Com {selectedTherapist?.name}
                </Text>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesScroll}>
              {dates.map((date, idx) => {
                const isSelected = date.getTime() === selectedDate.getTime();
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dateCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[
                      styles.dateDayName, 
                      { color: isSelected ? "#FFFFFF" : colors.textSecondary }
                    ]}>
                      {format(date, "EEE", { locale: ptBR }).toUpperCase()}
                    </Text>
                    <Text style={[
                      styles.dateDayNumber, 
                      { color: isSelected ? "#FFFFFF" : colors.text }
                    ]}>
                      {format(date, "d")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>Horários Disponíveis</Text>
            
            {isLoadingSlots ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
            ) : availableSlots.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Não há horários disponíveis para este dia.
              </Text>
            ) : (
              <View style={styles.slotsGrid}>
                {availableSlots.map(slot => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedSlot === slot && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[
                      styles.slotText,
                      { color: selectedSlot === slot ? "#FFFFFF" : colors.text }
                    ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.footer}>
              <Button
                title="Confirmar Agendamento"
                onPress={handleBook}
                disabled={!selectedSlot || isBooking}
                loading={isBooking}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screen,
    paddingVertical: 16,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: Spacing.screen, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  therapistCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: { fontSize: 20, fontWeight: "700" },
  therapistInfo: { flex: 1 },
  therapistName: { fontSize: 16, fontWeight: "600" },
  therapistRole: { fontSize: 14, marginTop: 4 },
  emptyText: { fontSize: 15, textAlign: "center", marginTop: 24 },
  selectedTherapistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectedTherapistName: { fontSize: 14, fontWeight: "600" },
  datesScroll: { gap: 12, paddingBottom: 8 },
  dateCard: {
    width: 72,
    height: 84,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateDayName: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  dateDayNumber: { fontSize: 20, fontWeight: "700" },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  slotCard: {
    width: "30%",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  slotText: { fontSize: 16, fontWeight: "600" },
  footer: { marginTop: 40 },
});
