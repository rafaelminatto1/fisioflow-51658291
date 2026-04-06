import { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Switch,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Modal,
	Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColorScheme';
import { useHaptics } from '@/hooks/useHaptics';
import { Card, Button } from '@/components';
import { fetchApi } from '@/lib/api';

const DAYS = [
	{ key: 1, label: 'Segunda-feira' },
	{ key: 2, label: 'Terça-feira' },
	{ key: 3, label: 'Quarta-feira' },
	{ key: 4, label: 'Quinta-feira' },
	{ key: 5, label: 'Sexta-feira' },
	{ key: 6, label: 'Sábado' },
	{ key: 0, label: 'Domingo' },
] as const;

const DEFAULT_OPEN = '08:00';
const DEFAULT_CLOSE = '18:00';

type DayHours = {
	day_of_week: number;
	is_open: boolean;
	open_time: string;
	close_time: string;
};

type PickerTarget = {
	day_of_week: number;
	field: 'open_time' | 'close_time';
};

function timeToDate(timeStr: string): Date {
	const [h, m] = timeStr.split(':').map(Number);
	const d = new Date();
	d.setHours(h, m, 0, 0);
	return d;
}

function dateToTime(d: Date): string {
	const h = String(d.getHours()).padStart(2, '0');
	const m = String(d.getMinutes()).padStart(2, '0');
	return `${h}:${m}`;
}

function buildDefaults(): DayHours[] {
	return DAYS.map(({ key }) => ({
		day_of_week: key,
		is_open: key >= 1 && key <= 5,
		open_time: DEFAULT_OPEN,
		close_time: DEFAULT_CLOSE,
	}));
}

export default function WorkingHoursScreen() {
	const colors = useColors();
	const { light, success: successHaptic, error: errorHaptic } = useHaptics();
	const [hours, setHours] = useState<DayHours[]>(buildDefaults());
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Picker state
	const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
	const [pickerDate, setPickerDate] = useState(new Date());

	const load = useCallback(async () => {
		try {
			const res = await fetchApi<{ data: any[] }>('/api/scheduling/settings/business-hours');
			const rows: any[] = res?.data ?? [];
			if (rows.length > 0) {
				setHours(
					DAYS.map(({ key }) => {
						const row = rows.find((r: any) => r.day_of_week === key);
						return {
							day_of_week: key,
							is_open: row ? (row.is_open ?? !row.is_closed) : key >= 1 && key <= 5,
							open_time: row?.open_time || row?.start_time || DEFAULT_OPEN,
							close_time: row?.close_time || row?.end_time || DEFAULT_CLOSE,
						};
					}),
				);
			}
		} catch {
			// Keep defaults on error — non-fatal
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const toggleDay = (dayKey: number) => {
		light();
		setHours((prev) =>
			prev.map((d) => (d.day_of_week === dayKey ? { ...d, is_open: !d.is_open } : d)),
		);
	};

	const openPicker = (dayKey: number, field: 'open_time' | 'close_time') => {
		const day = hours.find((h) => h.day_of_week === dayKey);
		const currentTime = day?.[field] ?? DEFAULT_OPEN;
		setPickerDate(timeToDate(currentTime));
		setPickerTarget({ day_of_week: dayKey, field });
	};

	const applyPicker = (date: Date) => {
		if (!pickerTarget) return;
		const timeStr = dateToTime(date);
		setHours((prev) =>
			prev.map((d) =>
				d.day_of_week === pickerTarget.day_of_week
					? { ...d, [pickerTarget.field]: timeStr }
					: d,
			),
		);
	};

	const closePicker = () => setPickerTarget(null);

	const handleSave = async () => {
		setSaving(true);
		try {
			await fetchApi('/api/scheduling/settings/business-hours', {
				method: 'POST',
				data: hours,
			});
			successHaptic();
			Alert.alert('Salvo', 'Horários de atendimento atualizados com sucesso.', [
				{ text: 'OK', onPress: () => router.back() },
			]);
		} catch {
			errorHaptic();
			Alert.alert('Erro', 'Não foi possível salvar os horários. Tente novamente.');
		} finally {
			setSaving(false);
		}
	};

	const currentDay = pickerTarget
		? hours.find((h) => h.day_of_week === pickerTarget.day_of_week)
		: null;
	const pickerLabel = pickerTarget?.field === 'open_time' ? 'Abertura' : 'Fechamento';

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
			<View style={[styles.header, { borderBottomColor: colors.border }]}>
				<TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
					<Ionicons name="arrow-back" size={24} color={colors.text} />
				</TouchableOpacity>
				<Text style={[styles.title, { color: colors.text }]}>Horários de Atendimento</Text>
				<View style={{ width: 40 }} />
			</View>

			{loading ? (
				<ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
			) : (
				<ScrollView contentContainerStyle={styles.content}>
					<Text style={[styles.subtitle, { color: colors.textSecondary }]}>
						Configure os dias e horários em que você está disponível para atendimentos.
					</Text>

					{DAYS.map(({ key, label }) => {
						const day = hours.find((h) => h.day_of_week === key)!;
						return (
							<Card key={key} style={styles.dayCard}>
								<View style={styles.dayRow}>
									<View style={styles.dayLabelContainer}>
										<Text style={[styles.dayLabel, { color: colors.text }]}>{label}</Text>
										{!day.is_open && (
											<Text style={[styles.closedLabel, { color: colors.textMuted }]}>Fechado</Text>
										)}
									</View>
									<Switch
										value={day.is_open}
										onValueChange={() => toggleDay(key)}
										trackColor={{ false: colors.border, true: colors.primary + '66' }}
										thumbColor={day.is_open ? colors.primary : colors.textMuted}
									/>
								</View>

								{day.is_open && (
									<View style={styles.timesRow}>
										<View style={styles.timeGroup}>
											<Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Abertura</Text>
											<TouchableOpacity
												style={[styles.timeButton, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
												onPress={() => openPicker(key, 'open_time')}
											>
												<Ionicons name="time-outline" size={14} color={colors.textSecondary} />
												<Text style={[styles.timeText, { color: colors.text }]}>{day.open_time}</Text>
											</TouchableOpacity>
										</View>
										<Ionicons
											name="arrow-forward"
											size={16}
											color={colors.textMuted}
											style={{ marginTop: 22 }}
										/>
										<View style={styles.timeGroup}>
											<Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Fechamento</Text>
											<TouchableOpacity
												style={[styles.timeButton, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
												onPress={() => openPicker(key, 'close_time')}
											>
												<Ionicons name="time-outline" size={14} color={colors.textSecondary} />
												<Text style={[styles.timeText, { color: colors.text }]}>{day.close_time}</Text>
											</TouchableOpacity>
										</View>
									</View>
								)}
							</Card>
						);
					})}

					<Button
						title="Salvar Horários"
						onPress={handleSave}
						loading={saving}
						style={{ marginTop: 8, marginBottom: 32 }}
					/>
				</ScrollView>
			)}

			{/* Time Picker — inline on Android, modal on iOS */}
			{pickerTarget !== null && Platform.OS === 'android' && (
				<DateTimePicker
					value={pickerDate}
					mode="time"
					is24Hour
					display="default"
					onChange={(event, date) => {
						closePicker();
						if (event.type === 'set' && date) applyPicker(date);
					}}
				/>
			)}

			{pickerTarget !== null && Platform.OS === 'ios' && (
				<Modal transparent animationType="slide" visible>
					<View style={styles.modalBackdrop}>
						<View style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							<View style={styles.modalHeader}>
								<TouchableOpacity onPress={closePicker}>
									<Text style={{ color: colors.error, fontSize: 16 }}>Cancelar</Text>
								</TouchableOpacity>
								<Text style={[styles.modalTitle, { color: colors.text }]}>
									{pickerLabel} — {currentDay && DAYS.find(d => d.key === pickerTarget!.day_of_week)?.label}
								</Text>
								<TouchableOpacity
									onPress={() => {
										applyPicker(pickerDate);
										closePicker();
									}}
								>
									<Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>OK</Text>
								</TouchableOpacity>
							</View>
							<DateTimePicker
								value={pickerDate}
								mode="time"
								is24Hour
								display="spinner"
								onChange={(_, date) => { if (date) setPickerDate(date); }}
								style={{ height: 180 }}
							/>
						</View>
					</View>
				</Modal>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	backBtn: { padding: 4 },
	title: { fontSize: 18, fontWeight: '700' },
	content: { padding: 16, gap: 12 },
	subtitle: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
	dayCard: { padding: 16 },
	dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	dayLabelContainer: { flex: 1 },
	dayLabel: { fontSize: 16, fontWeight: '600' },
	closedLabel: { fontSize: 12, marginTop: 2 },
	timesRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
	timeGroup: { flex: 1 },
	timeLabel: { fontSize: 12, marginBottom: 6 },
	timeButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
	},
	timeText: { fontSize: 15, fontWeight: '600' },
	modalBackdrop: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	modalSheet: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		borderWidth: 1,
		paddingBottom: 32,
	},
	modalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	modalTitle: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 8 },
});
