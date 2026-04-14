import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AppointmentBase } from "@/types";
import { formatAppointmentTime } from "./utils";
import { isSameDay } from "date-fns";

const SNAP_MINUTES = 15;

function topToTime(snappedTop: number, startHour: number, hourHeight: number): string {
	"worklet";
	const totalMinutes =
		Math.round((snappedTop / hourHeight) * 60) + startHour * 60;
	const h = Math.floor(totalMinutes / 60) % 24;
	const m = totalMinutes % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatStatus(status?: string): string {
	const map: Record<string, string> = {
		agendado: "Agendado",
		scheduled: "Agendado",
		confirmado: "Confirmado",
		confirmed: "Confirmado",
		em_atendimento: "Em atendimento",
		in_progress: "Em atendimento",
		cancelado: "Cancelado",
		cancelled: "Cancelado",
		concluido: "Concluído",
		completed: "Concluído",
		faltou: "Faltou",
		no_show: "Faltou",
	};
	return map[(status || "").toLowerCase()] ?? (status || "Agendado");
}

function getCardColors(apt: AppointmentBase, primary: string) {
	const typeLower = (apt.type || "").toLowerCase();
	const statusLower = apt.status || "";

	if (statusLower === "agendado" || statusLower === "scheduled") {
		return {
			bg: "#fffbeb",
			borderLeft: "#f59e0b",
			border: "#fef3c7",
			text: "#b45309",
		}; // Amber
	}
	if (
		statusLower === "confirmado" ||
		statusLower === "confirmed" ||
		typeLower.includes("avaliação") ||
		typeLower.includes("assessment")
	) {
		return {
			bg: "#ecfdf5",
			borderLeft: "#10b981",
			border: "#d1fae5",
			text: "#047857",
		}; // Emerald
	}
	if (
		statusLower === "em_atendimento" ||
		statusLower === "in_progress" ||
		typeLower.includes("pilates") ||
		typeLower.includes("grupo")
	) {
		return {
			bg: "#eef2ff",
			borderLeft: "#6366f1",
			border: "#e0e7ff",
			text: "#4338ca",
		}; // Indigo
	}

	return {
		bg: primary + "10",
		borderLeft: primary,
		border: primary + "30",
		text: primary,
	}; // Brand default
}

interface DraggableAptCardColors {
	primary: string;
	textSecondary: string;
}

export interface DraggableAptCardProps {
	apt: AppointmentBase & { top: number; height: number };
	pos: { left: number; width: number };
	startHour: number;
	endHour: number;
	hourHeight?: number;
	targetDay: Date;
	allDays: Date[];
	columnWidth: number;
	onReschedule?: (id: string, newDate: Date, time: string) => void;
	onRescheduleRequest?: (
		id: string,
		newDate: Date,
		time: string,
		confirm: (confirm: boolean) => void,
	) => void;
	onScrollEnable: (enabled: boolean) => void;
	colors: DraggableAptCardColors;
	/** Optional onPress for navigating to appointment detail */
	onPress?: () => void;
}

export const DraggableAptCard = ({
	apt,
	pos,
	startHour,
	endHour,
	hourHeight = 60,
	targetDay,
	allDays,
	columnWidth,
	onReschedule,
	onRescheduleRequest,
	onScrollEnable,
	colors,
	onPress,
}: DraggableAptCardProps) => {
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const isDragging = useSharedValue(false);
	const ghostTop = useSharedValue(apt.top);
	const ghostColumnIndex = useSharedValue(0);
	const isTiny = apt.height < 48;
	const isCompact = apt.height >= 48 && apt.height < 72;

	const snapPx = (SNAP_MINUTES / 60) * hourHeight;
	const maxTop = (endHour - startHour) * hourHeight - apt.height;
	const cardColors = getCardColors(apt, colors.primary);
	const displayTime = formatAppointmentTime(apt.time, apt.date);
	const titleLines = isTiny ? 1 : 2;

	const currentColumnIndex = allDays.findIndex(
		(d) => isSameDay(d, targetDay),
	);

	const handleConfirm = (confirm: boolean, newDay: Date, newTime: string) => {
		if (confirm && onReschedule) {
			onReschedule(apt.id, newDay, newTime);
		}
	};

	const handleReschedule = (newColumnIndex: number, newTime: string) => {
		const newDay = allDays[newColumnIndex];
		if (!newDay || !newTime) return;

		const hasChangedDay = !isSameDay(newDay, targetDay);
		const hasChangedTime = newTime !== apt.time;

		if (hasChangedDay || hasChangedTime) {
			if (onRescheduleRequest) {
				onRescheduleRequest(
					apt.id,
					newDay,
					newTime,
					(confirm: boolean) => handleConfirm(confirm, newDay, newTime),
				);
			} else if (onReschedule) {
				onReschedule(apt.id, newDay, newTime);
			}
		}
	};

	const panGesture = Gesture.Pan()
		.activateAfterLongPress(500)
		.onStart(() => {
			isDragging.value = true;
			runOnJS(onScrollEnable)(false);
			ghostColumnIndex.value = currentColumnIndex;
		})
		.onUpdate((e) => {
			translateY.value = e.translationY;
			translateX.value = e.translationX;

			const rawTop = apt.top + e.translationY;
			const clamped = Math.max(0, Math.min(rawTop, maxTop));
			ghostTop.value = Math.round(clamped / snapPx) * snapPx;

			const rawColumn =
				currentColumnIndex + Math.round(e.translationX / columnWidth);
			const newColumn = Math.max(0, Math.min(rawColumn, allDays.length - 1));
			ghostColumnIndex.value = newColumn;
		})
		.onEnd(() => {
			const newTime = topToTime(ghostTop.value, startHour, hourHeight);
			const newColumnIndex = ghostColumnIndex.value;

			translateX.value = withSpring(0);
			translateY.value = withSpring(0);
			isDragging.value = false;
			runOnJS(onScrollEnable)(true);

			runOnJS(handleReschedule)(newColumnIndex, newTime);
		})
		.onFinalize((_e, success) => {
			if (!success) {
				translateX.value = withSpring(0);
				translateY.value = withSpring(0);
				isDragging.value = false;
				runOnJS(onScrollEnable)(true);
			}
		});

	const cardAnimatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateY: translateY.value },
			{ translateX: translateX.value },
		],
		opacity: isDragging.value ? 0.7 : 1,
		zIndex: isDragging.value ? 100 : 2,
		elevation: isDragging.value ? 8 : 2,
	}));

	const ghostAnimatedStyle = useAnimatedStyle(() => {
		const ghostLeft = ghostColumnIndex.value * columnWidth + 1;
		return {
			top: ghostTop.value,
			left: ghostLeft,
			width: columnWidth - 2,
			opacity: isDragging.value ? 1 : 0,
		};
	});

	return (
		<>
			{/* Ghost indicator — dashed border at the snapped target position */}
			<Animated.View
				pointerEvents="none"
				style={[
					styles.ghost,
					{
						left: pos.left,
						width: pos.width,
						height: apt.height,
						borderColor: cardColors.text,
					},
					ghostAnimatedStyle,
				]}
			/>

			{/* Draggable card */}
			<GestureDetector gesture={panGesture}>
				<Animated.View
					style={[
						styles.card,
						{
							top: apt.top,
							height: apt.height,
							left: pos.left,
							width: pos.width,
							backgroundColor: cardColors.bg,
							borderLeftColor: cardColors.borderLeft,
							borderColor: cardColors.border,
						},
						cardAnimatedStyle,
					]}
					onTouchEnd={onPress}
				>
					<Animated.View
						style={[
							styles.cardInner,
							isCompact && styles.cardInnerCompact,
							isTiny && styles.cardInnerTiny,
						]}
					>
						<Animated.View
							style={[
								styles.cardHeader,
								isCompact && styles.cardHeaderCompact,
								isTiny && styles.cardHeaderTiny,
							]}
						>
							<Text
								style={[
									styles.aptType,
									{
										color: cardColors.text,
										backgroundColor: cardColors.text + "18",
									},
									isTiny && styles.aptTypeTiny,
								]}
								numberOfLines={1}
							>
								{formatStatus(apt.status)}
							</Text>
						</Animated.View>
						<Text
							style={[
								styles.aptTitle,
								isCompact && styles.aptTitleCompact,
								isTiny && styles.aptTitleTiny,
							]}
							numberOfLines={titleLines}
						>
							{apt.isGroup ? "Sessão em grupo" : apt.patientName || "Paciente"}
						</Text>
						{!isTiny && apt.additionalNames ? (
							<Text style={styles.additionalPatients} numberOfLines={1}>
								+ {apt.additionalNames}
							</Text>
						) : null}
						<View
							style={[
								styles.cardFooter,
								isCompact && styles.cardFooterCompact,
								isTiny && styles.cardFooterTiny,
							]}
						>
							{!isTiny && apt.isUnlimited && (
								<View
									style={[
										styles.badge,
										{ backgroundColor: cardColors.text + "20" },
									]}
								>
									<Text style={[styles.badgeText, { color: cardColors.text }]}>
										∞ ILIMITADO
									</Text>
								</View>
							)}
						</View>
					</Animated.View>
				</Animated.View>
			</GestureDetector>
		</>
	);
};

const styles = StyleSheet.create({
	ghost: {
		position: "absolute",
		borderRadius: 12,
		borderWidth: 2,
		borderStyle: "dashed",
	},
	card: {
		position: "absolute",
		borderRadius: 12,
		borderLeftWidth: 4,
		borderWidth: 1,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	cardInner: {
		flex: 1,
		paddingLeft: 8,
		paddingRight: 2, // Quase sem margem na direita
		paddingVertical: 4, // Diminuído
	},
	cardInnerCompact: {
		paddingLeft: 6,
		paddingRight: 2,
		paddingVertical: 2,
	},
	cardInnerTiny: {
		paddingLeft: 4,
		paddingRight: 1,
		paddingVertical: 1,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 2, // Diminuído
	},
	cardHeaderCompact: {
		marginBottom: 1,
	},
	cardHeaderTiny: {
		marginBottom: 1,
	},
	aptType: {
		fontSize: 6.5, // Diminuído
		fontWeight: "800",
		paddingHorizontal: 4,
		paddingVertical: 0.5,
		borderRadius: 999,
		overflow: "hidden",
		textTransform: "uppercase", // Estilo mais limpo
	},
	aptTypeTiny: {
		fontSize: 5.5,
		paddingHorizontal: 3,
		paddingVertical: 0.2,
	},
	aptTitle: {
		fontSize: 10,
		fontWeight: "800",
		color: "#0f172a",
		lineHeight: 11,
		marginRight: 0, // Garante que use todo espaço
	},
	aptTitleCompact: {
		fontSize: 9,
		lineHeight: 10,
	},
	aptTitleTiny: {
		fontSize: 8,
		lineHeight: 9,
	},
	aptTime: {
		fontSize: 9,
		fontWeight: "600",
		color: "#64748b",
	},
	aptTimeCompact: {
		fontSize: 8,
	},
	aptTimeTiny: {
		fontSize: 8,
	},
	cardFooter: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 2, // Diminuído
	},
	cardFooterCompact: {
		marginTop: 1,
	},
	cardFooterTiny: {
		marginTop: 1,
	},
	additionalPatients: {
		fontSize: 11,
		color: "#64748b",
		marginTop: 2,
		fontStyle: "italic",
	},
	badge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	badgeText: {
		fontSize: 9,
		fontWeight: "900",
		letterSpacing: 0.5,
	},
});
