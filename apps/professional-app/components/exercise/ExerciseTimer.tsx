import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useColors } from "@/hooks/useColorScheme";
import { useHaptics } from "@/hooks/useHaptics";
import { Ionicons } from "@expo/vector-icons";

export interface ExerciseTimerProps {
	exerciseName: string;
	sets: number;
	reps: number;
	restSeconds?: number;
	holdSeconds?: number;
	onComplete?: () => void;
	onSetComplete?: (currentSet: number) => void;
}

type TimerState = "ready" | "exercising" | "resting" | "complete";

const STATE_COLORS: Record<TimerState, string> = {
	ready: "#3B82F6",
	exercising: "#10B981",
	resting: "#F59E0B",
	complete: "#EAB308",
};

const RING_SIZE = 220;
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ExerciseTimer({
	exerciseName,
	sets,
	reps,
	restSeconds = 60,
	holdSeconds,
	onComplete,
	onSetComplete,
}: ExerciseTimerProps) {
	const colors = useColors();
	const { light, medium, heavy, success, warning, selection } = useHaptics();

	const [state, setState] = useState<TimerState>("ready");
	const [currentSet, setCurrentSet] = useState(1);
	const [currentRep, setCurrentRep] = useState(0);
	const [timeLeft, setTimeLeft] = useState(holdSeconds || 0);
	const [isPaused, setIsPaused] = useState(false);

	const stateRef = useRef(state);
	const currentSetRef = useRef(currentSet);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	stateRef.current = state;
	currentSetRef.current = currentSet;

	const clearTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => clearTimer();
	}, [clearTimer]);

	useEffect(() => {
		if (isPaused || state === "ready" || state === "complete") {
			clearTimer();
			return;
		}

		intervalRef.current = setInterval(() => {
			if (stateRef.current === "exercising" && holdSeconds) {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearTimer();
						medium();
						if (currentSetRef.current < sets) {
							setState("resting");
							setTimeLeft(restSeconds);
						} else {
							success();
							setState("complete");
							onComplete?.();
						}
						return 0;
					}
					return prev - 1;
				});
			} else if (stateRef.current === "resting") {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						clearTimer();
						heavy();
						const nextSet = currentSetRef.current + 1;
						setCurrentSet(nextSet);
						onSetComplete?.(currentSetRef.current);
						setCurrentRep(0);
						setState("exercising");
						setTimeLeft(holdSeconds || 0);
						return 0;
					}
					return prev - 1;
				});
			} else if (stateRef.current === "exercising" && !holdSeconds) {
				setCurrentRep((prev) => {
					if (prev >= reps - 1) {
						clearTimer();
						medium();
						if (currentSetRef.current < sets) {
							setState("resting");
							setTimeLeft(restSeconds);
						} else {
							success();
							setState("complete");
							onComplete?.();
						}
						return 0;
					}
					return prev + 1;
				});
			}
		}, 1000);

		return () => clearTimer();
	}, [
		state,
		isPaused,
		sets,
		reps,
		restSeconds,
		holdSeconds,
		onComplete,
		onSetComplete,
		clearTimer,
		medium,
		heavy,
		success,
	]);

	const handleStart = useCallback(() => {
		light();
		setState("exercising");
		setCurrentSet(1);
		setCurrentRep(0);
		setTimeLeft(holdSeconds || 0);
		setIsPaused(false);
	}, [holdSeconds, light]);

	const handlePause = useCallback(() => {
		selection();
		setIsPaused((prev) => !prev);
	}, [selection]);

	const handleReset = useCallback(() => {
		warning();
		clearTimer();
		setState("ready");
		setCurrentSet(1);
		setCurrentRep(0);
		setTimeLeft(holdSeconds || 0);
		setIsPaused(false);
	}, [holdSeconds, clearTimer, warning]);

	const handleRepDone = useCallback(() => {
		if (state !== "exercising" || holdSeconds) return;
		selection();
		setCurrentRep((prev) => {
			if (prev >= reps - 1) {
				clearTimer();
				medium();
				if (currentSetRef.current < sets) {
					setState("resting");
					setTimeLeft(restSeconds);
				} else {
					success();
					setState("complete");
					onComplete?.();
				}
				return 0;
			}
			return prev + 1;
		});
	}, [
		state,
		holdSeconds,
		reps,
		sets,
		restSeconds,
		clearTimer,
		medium,
		success,
		onComplete,
		selection,
	]);

	const totalDuration =
		state === "exercising"
			? holdSeconds || 0
			: state === "resting"
				? restSeconds
				: 0;
	const progress =
		totalDuration > 0
			? ((totalDuration - timeLeft) / totalDuration) * CIRCUMFERENCE
			: 0;
	const stateColor = STATE_COLORS[state];

	const displayTime = () => {
		if (state === "exercising" && !holdSeconds) {
			return `${currentRep + 1}/${reps}`;
		}
		if (state === "ready") {
			return "0:00";
		}
		const m = Math.floor(timeLeft / 60);
		const s = timeLeft % 60;
		return `${m}:${s.toString().padStart(2, "0")}`;
	};

	const stateLabels: Record<TimerState, string> = {
		ready: "Pronto",
		exercising: holdSeconds ? "Segure" : "Exercitando",
		resting: "Descanso",
		complete: "Concluído!",
	};

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }]}
			edges={["bottom"]}
		>
			<Text
				style={[styles.exerciseName, { color: colors.text }]}
				numberOfLines={2}
			>
				{exerciseName}
			</Text>

			<Text style={[styles.setState, { color: stateColor }]}>
				Série {currentSet}/{sets}
			</Text>

			<View style={styles.ringContainer}>
				<Svg width={RING_SIZE} height={RING_SIZE}>
					<Circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RADIUS}
						stroke={colors.border}
						strokeWidth={STROKE_WIDTH}
						fill="transparent"
					/>
					<Circle
						cx={RING_SIZE / 2}
						cy={RING_SIZE / 2}
						r={RADIUS}
						stroke={stateColor}
						strokeWidth={STROKE_WIDTH}
						fill="transparent"
						strokeDasharray={CIRCUMFERENCE}
						strokeDashoffset={CIRCUMFERENCE - progress}
						strokeLinecap="round"
						transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
					/>
				</Svg>
				<View style={styles.ringContent}>
					<Text style={[styles.timerLabel, { color: stateColor }]}>
						{stateLabels[state]}
					</Text>
					<Text style={[styles.timerDisplay, { color: colors.text }]}>
						{displayTime()}
					</Text>
				</View>
			</View>

			{state === "exercising" && !holdSeconds && (
				<TouchableOpacity
					style={[styles.repBtn, { borderColor: stateColor }]}
					onPress={handleRepDone}
					accessibilityLabel="Marcar repetição"
					accessibilityRole="button"
				>
					<Text style={[styles.repBtnText, { color: stateColor }]}>
						Rep feita ({currentRep + 1}/{reps})
					</Text>
				</TouchableOpacity>
			)}

			{state === "resting" && (
				<Text style={[styles.restInfo, { color: colors.textSecondary }]}>
					Descanse antes da próxima série
				</Text>
			)}

			<View style={styles.controls}>
				{state === "ready" && (
					<TouchableOpacity
						style={[styles.controlBtn, { backgroundColor: STATE_COLORS.ready }]}
						onPress={handleStart}
						accessibilityLabel="Iniciar exercício"
						accessibilityRole="button"
					>
						<Ionicons name="play" size={28} color="#FFFFFF" />
						<Text style={styles.controlText}>Iniciar</Text>
					</TouchableOpacity>
				)}

				{(state === "exercising" || state === "resting") && (
					<>
						<TouchableOpacity
							style={[styles.controlBtn, { backgroundColor: stateColor }]}
							onPress={handlePause}
							accessibilityLabel={isPaused ? "Retomar" : "Pausar"}
							accessibilityRole="button"
						>
							<Ionicons
								name={isPaused ? "play" : "pause"}
								size={28}
								color="#FFFFFF"
							/>
							<Text style={styles.controlText}>
								{isPaused ? "Retomar" : "Pausar"}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[
								styles.controlBtn,
								styles.secondaryBtn,
								{ borderColor: colors.border },
							]}
							onPress={handleReset}
							accessibilityLabel="Resetar"
							accessibilityRole="button"
						>
							<Ionicons name="refresh" size={24} color={colors.text} />
							<Text style={[styles.controlText, { color: colors.text }]}>
								Resetar
							</Text>
						</TouchableOpacity>
					</>
				)}

				{state === "complete" && (
					<TouchableOpacity
						style={[
							styles.controlBtn,
							{ backgroundColor: STATE_COLORS.complete },
						]}
						onPress={handleReset}
						accessibilityLabel="Refazer exercício"
						accessibilityRole="button"
					>
						<Ionicons name="checkmark-done" size={28} color="#FFFFFF" />
						<Text style={styles.controlText}>Concluído</Text>
					</TouchableOpacity>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	exerciseName: {
		fontSize: 20,
		fontWeight: "700",
		textAlign: "center",
		marginBottom: 4,
	},
	setState: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 24,
	},
	ringContainer: {
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	ringContent: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
	},
	timerLabel: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: 4,
	},
	timerDisplay: {
		fontSize: 42,
		fontWeight: "800",
		fontVariant: ["tabular-nums"],
	},
	repBtn: {
		borderWidth: 2,
		borderRadius: 14,
		paddingHorizontal: 28,
		paddingVertical: 14,
		marginBottom: 16,
	},
	repBtnText: {
		fontSize: 16,
		fontWeight: "700",
	},
	restInfo: {
		fontSize: 14,
		marginBottom: 16,
		textAlign: "center",
	},
	controls: {
		flexDirection: "row",
		gap: 16,
		marginTop: 8,
	},
	controlBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingHorizontal: 28,
		paddingVertical: 14,
		borderRadius: 14,
		minWidth: 140,
	},
	secondaryBtn: {
		backgroundColor: "transparent",
		borderWidth: 2,
	},
	controlText: {
		color: "#FFFFFF",
		fontSize: 16,
		fontWeight: "700",
	},
});
