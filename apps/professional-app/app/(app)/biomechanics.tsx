import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, SafeAreaView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Camera, useCameraDevice, useCameraPermission, useCameraFormat } from "react-native-vision-camera";
import { Accelerometer } from "expo-sensors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function BiomechanicsScreen() {
	// ── ALL hooks must be at the top before any conditional return ──
	const router = useRouter();
	const device = useCameraDevice("back", {
		physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera']
	});
	const format = useCameraFormat(device, [
		{ fps: 240 },
		{ fps: 120 },
		{ videoResolution: 'max' }
	]);
	const fps = format?.maxFps ?? 60;

	const { hasPermission, requestPermission } = useCameraPermission();
	const [isRecording, setIsRecording] = useState(false);
	const [showGrid] = useState(true);
	const [, setPlumbRotation] = useState(0);
	const [, setGaitEvents] = useState<{ type: string; frame: number }[]>([]);
	const [frameCounter, setFrameCounter] = useState(0);
	const camera = useRef<Camera>(null);
	const containerRef = useRef<View>(null);

	useEffect(() => {
		let subscription: any;
		if (showGrid) {
			Accelerometer.setUpdateInterval(50);
			subscription = Accelerometer.addListener(({ x, y }) => {
				const angle = Math.atan2(x, y) * (180 / Math.PI);
				setPlumbRotation(-angle + 180);
			});
		}
		return () => {
			if (subscription) subscription.remove();
		};
	}, [showGrid]);

	useEffect(() => {
		let interval: any;
		if (isRecording) {
			interval = setInterval(() => {
				setFrameCounter(f => f + 1);
			}, 1000 / fps);
		} else {
			setFrameCounter(0);
		}
		return () => clearInterval(interval);
	}, [isRecording, fps]);

	// ── Conditional renders AFTER all hooks ──
	if (!hasPermission) {
		return (
			<SafeAreaView style={styles.permissionContainer}>
				<Text style={styles.permissionText}>Precisamos de permissão para usar a câmera.</Text>
				<TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
					<Text style={styles.permissionButtonText}>Conceder Permissão</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	if (device == null) {
		return (
			<SafeAreaView style={styles.permissionContainer}>
				<Text style={styles.permissionText}>Câmera não encontrada.</Text>
				<TouchableOpacity style={styles.permissionButton} onPress={() => router.back()}>
					<Text style={styles.permissionButtonText}>Voltar</Text>
				</TouchableOpacity>
			</SafeAreaView>
		);
	}

	const markEvent = (type: string) => {
		setGaitEvents(prev => [...prev, { type, frame: frameCounter }]);
		Alert.alert("Evento Marcado", `${type} no frame ${frameCounter}`);
	};

	const toggleRecording = () => {
		setIsRecording(r => !r);
	};

	return (
		<View style={styles.container} ref={containerRef}>
			<Camera
				ref={camera}
				style={StyleSheet.absoluteFill}
				device={device}
				format={format}
				fps={fps}
				isActive={true}
				video={true}
				audio={false}
				photo={true}
			/>

			{/* Header with back button */}
			<SafeAreaView style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
					<Text style={styles.backButtonText}>← Voltar</Text>
				</TouchableOpacity>
				<Text style={styles.headerTitle}>Laboratório Biomecânico</Text>
				<View style={{ width: 80 }} />
			</SafeAreaView>

			{/* Record button */}
			<View style={styles.recordButtonContainer}>
				<TouchableOpacity
					style={[styles.recordButton, isRecording && styles.recordButtonActive]}
					onPress={toggleRecording}
				>
					<Text style={styles.recordButtonText}>
						{isRecording ? '⏹ Parar' : '⏺ Gravar'}
					</Text>
				</TouchableOpacity>
			</View>

			{/* Gait event controls (shown only while recording) */}
			{isRecording && (
				<View style={styles.gaitControls}>
					<TouchableOpacity
						style={[styles.eventButton, { backgroundColor: '#22c55e' }]}
						onPress={() => markEvent('CONTATO')}
					>
						<Text style={styles.eventButtonText}>CONTATO</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.eventButton, { backgroundColor: '#ef4444' }]}
						onPress={() => markEvent('IMPULSÃO')}
					>
						<Text style={styles.eventButtonText}>IMPULSÃO</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	permissionContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#111',
		padding: 24,
	},
	permissionText: {
		color: '#fff',
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 24,
	},
	permissionButton: {
		backgroundColor: '#2563EB',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 10,
	},
	permissionButtonText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 16,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	backButton: {
		backgroundColor: 'rgba(0,0,0,0.5)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
	},
	backButtonText: {
		color: '#fff',
		fontWeight: '600',
	},
	headerTitle: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
		textShadowColor: '#000',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	recordButtonContainer: {
		position: 'absolute',
		bottom: 60,
		left: 0,
		right: 0,
		alignItems: 'center',
	},
	recordButton: {
		backgroundColor: 'rgba(255,255,255,0.2)',
		borderWidth: 2,
		borderColor: '#fff',
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 40,
	},
	recordButtonActive: {
		backgroundColor: 'rgba(239,68,68,0.7)',
		borderColor: '#ef4444',
	},
	recordButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '700',
	},
	gaitControls: {
		position: 'absolute',
		top: '40%',
		right: 20,
		gap: 20,
	},
	eventButton: {
		paddingHorizontal: 20,
		paddingVertical: 15,
		borderRadius: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 5,
		elevation: 8,
	},
	eventButtonText: {
		color: '#fff',
		fontWeight: '900',
		fontSize: 14,
	},
});
