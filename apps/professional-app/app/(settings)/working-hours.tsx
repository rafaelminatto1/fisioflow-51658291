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
} from 'react-native';
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

function buildDefaults(): DayHours[] {
	return DAYS.map(({ key }) => ({
		day_of_week: key,
		is_open: key >= 1 && key <= 5, // Mon-Fri open by default
		open_time: DEFAULT_OPEN,
		close_time: DEFAULT_CLOSE,
	}));
}

function TimeButton({ time, onPress, colors }: { time: string; onPress: () => void; colors: any }) {
	return (
		<TouchableOpacity
			style={[styles.timeButton, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
			onPress={onPress}
		>
			<Ionicons name="time-outline" size={14} color={colors.textSecondary} />
			<Text style={[styles.timeText, { color: colors.text }]}>{time}</Text>
		</TouchableOpacity>
	);
}

function timePrompt(current: string, onChange: (t: string) => void) {
	// Simple Alert-based time picker for cross-platform compatibility
	Alert.prompt(
		'Horário',
		'Digite no formato HH:MM (ex: 08:00)',
		[
			{ text: 'Cancelar', style: 'cancel' },
			{
				text: 'OK',
				onPress: (value) => {
					if (!value) return;
					const trimmed = value.trim();
					if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
						const [h, m] = trimmed.split(':').map(Number);
						if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
							onChange(trimmed.padStart(5, '0'));
							return;
						}
					}
					Alert.alert('Formato inválido', 'Use HH:MM, ex: 08:00 ou 17:30');
				},
			},
		],
		'plain-text',
		current,
	);
}

export default function WorkingHoursScreen() {
	const colors = useColors();
	const { light, success: successHaptic, error: errorHaptic } = useHaptics();
	const [hours, setHours] = useState<DayHours[]>(buildDefaults());
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await fetchApi<{ data: any[] }>('/api/scheduling/settings/business-hours');
			const rows: any[] = res?.data || [];
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
			// Keep defaults on error
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

	const setTime = (dayKey: number, field: 'open_time' | 'close_time', value: string) => {
		setHours((prev) =>
			prev.map((d) => (d.day_of_week === dayKey ? { ...d, [field]: value } : d)),
		);
	};

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
											<TimeButton
												time={day.open_time}
												colors={colors}
												onPress={() =>
													timePrompt(day.open_time, (v) => setTime(key, 'open_time', v))
												}
											/>
										</View>
										<Ionicons name="arrow-forward" size={16} color={colors.textMuted} style={{ marginTop: 20 }} />
										<View style={styles.timeGroup}>
											<Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Fechamento</Text>
											<TimeButton
												time={day.close_time}
												colors={colors}
												onPress={() =>
													timePrompt(day.close_time, (v) => setTime(key, 'close_time', v))
												}
											/>
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
	timesRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginTop: 12,
	},
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
});
