import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, SafeAreaView, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Camera, useCameraDevice, useCameraPermission, useCameraFormat } from "react-native-vision-camera";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "tamagui";
import { captureRef } from "react-native-view-shot";
import { Accelerometer } from "expo-sensors";

const { width, height } = Dimensions.get("window");

export default function BiomechanicsScreen() {
	const theme = useTheme();
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
	const [showGrid, setShowGrid] = useState(true);
	const [plumbRotation, setPlumbRotation] = useState(0);
	const camera = useRef<Camera>(null);
	const containerRef = useRef<View>(null);

	useEffect(() => {
		let subscription: any;
		if (showGrid) {
			Accelerometer.setUpdateInterval(50);
			subscription = Accelerometer.addListener(({ x, y }) => {
				// Calculate rotation angle based on gravity vector
				let angle = Math.atan2(x, y) * (180 / Math.PI);
				setPlumbRotation(-angle + 180);
			});
		}
		return () => {
			if (subscription) subscription.remove();
		};
	}, [showGrid]);

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
			</SafeAreaView>
		);
	}

	const toggleRecording = async () => {
		if (!camera.current) return;

		if (isRecording) {
			setIsRecording(false);
			await camera.current.stopRecording();
		} else {
			setIsRecording(true);
			camera.current.startRecording({
				onRecordingFinished: (video) => {
					Alert.alert("Vídeo Salvo", `Vídeo gravado em: ${video.path}`);
				},
				onRecordingError: (error) => {
					console.error("Recording failed", error);
					setIsRecording(false);
				}
			});
		}
	};

	const takeSnapshot = async () => {
		try {
			if (containerRef.current) {
				const uri = await captureRef(containerRef, {
					format: "jpg",
					quality: 0.9,
				});
				Alert.alert("Captura de Tela", `Snapshot salvo em: ${uri}`);
			}
		} catch (error) {
			console.error("Snapshot failed", error);
		}
	};

	const [gaitEvents, setGaitEvents] = useState<{type: string, frame: number}[]>([]);
	const [frameCounter, setFrameCounter] = useState(0);

	// Mock frame increment while recording
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

	const markEvent = (type: string) => {
		setGaitEvents(prev => [...prev, { type, frame: frameCounter }]);
		// Haptic feedback for tactile confirmation (standard in biomechanics apps)
		Alert.alert("Evento Marcado", `${type} no frame ${frameCounter}`);
	};

	return (
		<View style={styles.container} ref={containerRef}>
			{/* ... existing stack screen ... */}

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

			{/* Gait Event Controls (Runmatic Style) */}
			{isRecording && (
				<View style={styles.gaitControls}>
					<TouchableOpacity style={[styles.eventButton, {backgroundColor: '#22c55e'}]} onPress={() => markEvent('CONTATO')}>
						<Text style={styles.eventButtonText}>CONTATO</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.eventButton, {backgroundColor: '#ef4444'}]} onPress={() => markEvent('IMPULSÃO')}>
						<Text style={styles.eventButtonText}>IMPULSÃO</Text>
					</TouchableOpacity>
				</View>
			)}

			{/* ... rest of the existing UI ... */}
		</View>
	);
}

const styles = StyleSheet.create({
	// ... existing styles ...
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